package org.finos.calm.store.mongo;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Typed;
import jakarta.inject.Inject;
import org.bson.Document;
import org.finos.calm.domain.Decorator;
import org.finos.calm.domain.DecoratorHistoryEntry;
import org.finos.calm.domain.exception.DecoratorNotFoundException;
import org.finos.calm.domain.exception.DecoratorSupersededException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.store.DecoratorStore;
import org.finos.calm.store.util.DecoratorHistoryChain;
import org.finos.calm.store.util.MongoUpsertPush;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import io.quarkus.arc.lookup.LookupIfProperty;

/**
 * MongoDB implementation of DecoratorStore.
 */
@LookupIfProperty(name = "calm.database.mode", stringValue = "mongo", lookupIfMissing = true)
@ApplicationScoped
@Typed(MongoDecoratorStore.class)
public class MongoDecoratorStore implements DecoratorStore {

    private static final Logger LOG = LoggerFactory.getLogger(MongoDecoratorStore.class);
    private static final String DECORATOR_ID_FIELD = "decoratorId";
    // Hub-owned history links, stored beside the decorator rather than in it.
    private static final String SUPERSEDES_FIELD = "supersedes";
    private static final String SUPERSEDED_BY_FIELD = "supersededBy";
    private final MongoCollection<Document> decoratorCollection;
    private final MongoNamespaceStore namespaceStore;
    private final MongoCounterStore counterStore;

    @Inject
    public MongoDecoratorStore(MongoDatabase database, MongoNamespaceStore namespaceStore, MongoCounterStore counterStore) {
        this.decoratorCollection = database.getCollection("decorators");
        this.namespaceStore = namespaceStore;
        this.counterStore = counterStore;
    }

    @Override
    public List<Integer> getDecoratorsForNamespace(String namespace, String target, String type) throws NamespaceNotFoundException {
        namespaceStore.requireNamespace(namespace);

        Document namespaceDocument = fetchNamespaceDocument(namespace);
        if (namespaceDocument == null || namespaceDocument.isEmpty()) {
            LOG.debug("No decorators found for namespace '{}'", namespace);
            return List.of();
        }

        List<Document> decorators = extractDecorators(namespaceDocument, namespace);
        if (decorators.isEmpty()) {
            return List.of();
        }

        List<Integer> decoratorIds = filterDecorators(decorators, target, type);

        LOG.debug("Retrieved {} decorators for namespace '{}' with filters (target: {}, type: {})", 
                decoratorIds.size(), namespace, target, type);
        return decoratorIds;
    }

    @Override
    public List<Decorator> getDecoratorValuesForNamespace(String namespace, String target, String type) throws NamespaceNotFoundException {
        namespaceStore.requireNamespace(namespace);

        Document namespaceDocument = fetchNamespaceDocument(namespace);
        if (namespaceDocument == null || namespaceDocument.isEmpty()) {
            LOG.debug("No decorators found for namespace '{}'", namespace);
            return List.of();
        }

        List<Document> decorators = extractDecorators(namespaceDocument, namespace);
        if (decorators.isEmpty()) {
            return List.of();
        }

        List<Decorator> decoratorValues = filterDecoratorsToValues(decorators, target, type);

        LOG.debug("Retrieved {} decorator values for namespace '{}' with filters (target: {}, type: {})",
                decoratorValues.size(), namespace, target, type);
        return decoratorValues;
    }

    @Override
    public Optional<Decorator> getDecoratorById(String namespace, int id) throws NamespaceNotFoundException {
        namespaceStore.requireNamespace(namespace);

        Document namespaceDocument = fetchNamespaceDocument(namespace);
        if (namespaceDocument == null || namespaceDocument.isEmpty()) {
            return Optional.empty();
        }

        List<Document> decorators = extractDecorators(namespaceDocument, namespace);
        if (decorators.isEmpty()) {
            return Optional.empty();
        }

        return decorators.stream()
                .filter(decoratorDoc -> Integer.valueOf(id).equals(decoratorDoc.getInteger("decoratorId")))
                .map(decoratorDoc -> decoratorDoc.get("decorator", Document.class))
                .filter(Objects::nonNull)
                .map(Decorator::fromDocument)
                .findFirst();
    }

    @Override
    public int createDecorator(String namespace, String decoratorJson) throws NamespaceNotFoundException {
        namespaceStore.requireNamespace(namespace);

        Document parsedDecorator = Document.parse(decoratorJson);
        int id = counterStore.getNextDecoratorSequenceValue();
        Document decoratorDocument = new Document("decoratorId", id)
                .append("decorator", parsedDecorator);

        MongoUpsertPush.pushWithDuplicateRetry(decoratorCollection,
                Filters.eq("namespace", namespace),
                "decorators", decoratorDocument);

        LOG.debug("Created decorator with ID {} in namespace '{}'", id, namespace);
        return id;
    }

    @Override
    public void updateDecorator(String namespace, int id, String decoratorJson) throws NamespaceNotFoundException, DecoratorNotFoundException {
        namespaceStore.requireNamespace(namespace);

        Document parsedDecorator = Document.parse(decoratorJson);

        long modified = decoratorCollection.updateOne(
                Filters.and(Filters.eq("namespace", namespace), Filters.elemMatch("decorators",
                        Filters.and(Filters.eq(DECORATOR_ID_FIELD, id), Filters.exists(SUPERSEDED_BY_FIELD, false)))),
                Updates.set("decorators.$.decorator", parsedDecorator)
        ).getModifiedCount();

        if (modified == 0) {
            throw new DecoratorNotFoundException();
        }

        LOG.debug("Updated decorator with ID {} in namespace '{}'", id, namespace);
    }

    @Override
    public int supersedeDecorator(String namespace, int id, String decoratorJson)
            throws NamespaceNotFoundException, DecoratorNotFoundException, DecoratorSupersededException {
        namespaceStore.requireNamespace(namespace);

        Document parsedDecorator = Document.parse(decoratorJson);
        int newId = counterStore.getNextDecoratorSequenceValue();

        // Replace the links and append the successor in one atomic namespace-document update.
        Document successor = new Document(DECORATOR_ID_FIELD, newId)
                .append("decorator", parsedDecorator)
                .append(SUPERSEDES_FIELD, id);
        Document marked = new Document("$map", new Document("input", "$decorators")
                .append("as", "entry")
                .append("in", new Document("$cond", List.of(
                        new Document("$eq", List.of("$$entry.decoratorId", id)),
                        new Document("$mergeObjects", List.of("$$entry",
                                new Document(SUPERSEDED_BY_FIELD, newId))),
                        "$$entry"))));
        List<Document> update = List.of(new Document("$set", new Document("decorators",
                new Document("$concatArrays", List.of(marked,
                        new Document("$literal", List.of(successor)))))));
        long modified = decoratorCollection.updateOne(
                Filters.and(Filters.eq("namespace", namespace), Filters.elemMatch("decorators",
                        Filters.and(Filters.eq(DECORATOR_ID_FIELD, id), Filters.exists(SUPERSEDED_BY_FIELD, false)))),
                update
        ).getModifiedCount();

        if (modified == 0) {
            if (getDecoratorById(namespace, id).isPresent()) {
                throw new DecoratorSupersededException();
            }
            throw new DecoratorNotFoundException();
        }

        LOG.debug("Decorator with ID {} supersedes decorator {} in namespace '{}'", newId, id, namespace);
        return newId;
    }

    @Override
    public List<DecoratorHistoryEntry> getDecoratorHistory(String namespace, int id)
            throws NamespaceNotFoundException, DecoratorNotFoundException {
        namespaceStore.requireNamespace(namespace);

        List<DecoratorHistoryEntry> history = DecoratorHistoryChain.of(historyEntries(namespace), id);
        if (history.isEmpty()) {
            throw new DecoratorNotFoundException();
        }
        return history;
    }

    @Override
    public void deleteDecorator(String namespace, int id) throws NamespaceNotFoundException, DecoratorNotFoundException {
        namespaceStore.requireNamespace(namespace);

        List<Integer> ids = DecoratorHistoryChain.of(historyEntries(namespace), id).stream()
                .map(DecoratorHistoryEntry::getId)
                .toList();
        if (ids.isEmpty()) {
            throw new DecoratorNotFoundException();
        }

        long modified = decoratorCollection.updateOne(
                Filters.eq("namespace", namespace),
                Updates.pull("decorators", Filters.in(DECORATOR_ID_FIELD, ids))
        ).getModifiedCount();

        if (modified == 0) {
            throw new DecoratorNotFoundException();
        }

        LOG.debug("Deleted decorator with ID {} in namespace '{}'", id, namespace);
    }

    /**
     * Fetches the namespace document from MongoDB
     */
    private Document fetchNamespaceDocument(String namespace) {
        return decoratorCollection.find(Filters.eq("namespace", namespace)).first();
    }

    /**
     * Extracts the list of decorators from the namespace document
     */
    private List<Document> extractDecorators(Document namespaceDocument, String namespace) {
        List<Document> decorators = namespaceDocument.getList("decorators", Document.class);
        if (decorators == null || decorators.isEmpty()) {
            LOG.debug("Decorators list is empty for namespace '{}'", namespace);
            return List.of();
        }
        return decorators;
    }

    private List<DecoratorHistoryEntry> historyEntries(String namespace) {
        Document namespaceDocument = fetchNamespaceDocument(namespace);
        if (namespaceDocument == null) {
            return List.of();
        }
        return extractDecorators(namespaceDocument, namespace).stream()
                .filter(doc -> doc.getInteger(DECORATOR_ID_FIELD) != null)
                .map(doc -> new DecoratorHistoryEntry(
                        doc.getInteger(DECORATOR_ID_FIELD),
                        doc.getInteger(SUPERSEDES_FIELD),
                        doc.getInteger(SUPERSEDED_BY_FIELD),
                        Decorator.fromDocument(doc.get("decorator", Document.class))))
                .toList();
    }

    private Stream<Document> streamCurrent(List<Document> decorators) {
        return decorators.stream()
                .filter(doc -> doc.getInteger(DECORATOR_ID_FIELD) != null)
                .filter(doc -> doc.get(SUPERSEDED_BY_FIELD) == null);
    }

    private List<Integer> filterDecorators(List<Document> decorators, String target, String type) {
        return streamCurrent(decorators)
                .filter(doc -> {
                    Document decorator = doc.get("decorator", Document.class);
                    return decorator == null || matchesFilters(decorator, target, type);
                })
                .map(doc -> doc.getInteger(DECORATOR_ID_FIELD))
                .collect(Collectors.toList());
    }

    private List<Decorator> filterDecoratorsToValues(List<Document> decorators, String target, String type) {
        return streamCurrent(decorators)
                .map(doc -> doc.get("decorator", Document.class))
                .filter(Objects::nonNull)
                .filter(decorator -> matchesFilters(decorator, target, type))
                .map(Decorator::fromDocument)
                .collect(Collectors.toList());
    }

    /**
     * Checks if a decorator matches the provided filters
     */
    private boolean matchesFilters(Document decorator, String target, String type) {
        return matchesTypeFilter(decorator, type) && matchesTargetFilter(decorator, target);
    }

    /**
     * Checks if the decorator matches the type filter (if provided)
     */
    private boolean matchesTypeFilter(Document decorator, String type) {
        if (type == null || type.isEmpty()) {
            return true;
        }
        
        String decoratorType = decorator.getString("type");
        return decoratorType != null && decoratorType.equals(type);
    }

    /**
     * Checks if the decorator matches the target filter (if provided)
     */
    private boolean matchesTargetFilter(Document decorator, String target) {
        if (target == null || target.isBlank()) {
            return true;
        }
        
        List<String> targets = decorator.getList("target", String.class);
        return targets != null && targets.contains(target);
    }
}
