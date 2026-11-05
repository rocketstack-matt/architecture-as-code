package org.finos.calm.services;

import io.quarkus.security.identity.SecurityIdentity;
import io.vertx.core.json.DecodeException;
import io.vertx.core.json.JsonObject;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.bson.json.JsonParseException;
import org.finos.calm.config.DecoratorConfig;
import org.finos.calm.domain.Decorator;
import org.finos.calm.domain.DecoratorSchemaError;
import org.finos.calm.domain.exception.DecoratorNotFoundException;
import org.finos.calm.domain.exception.DecoratorSchemaValidationException;
import org.finos.calm.domain.exception.DecoratorSupersededException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.domain.exception.ReservedDecoratorTypeException;
import org.finos.calm.store.DecoratorStore;

import java.util.List;
import java.util.Optional;

/**
 * The write rules for decorators, shared by REST and MCP. A reserved type can only be written by
 * its configured principals, a decorator whose {@code $schema} Hub knows must match it, and a reserved
 * type is append-only.
 */
@ApplicationScoped
public class DecoratorWriteService {

    private final DecoratorStore decoratorStore;
    private final DecoratorConfig config;
    private final DecoratorSchemaValidator schemaValidator;

    @Inject
    public DecoratorWriteService(DecoratorStore decoratorStore, DecoratorConfig config, DecoratorSchemaValidator schemaValidator) {
        this.decoratorStore = decoratorStore;
        this.config = config;
        this.schemaValidator = schemaValidator;
    }

    public static String principalName(SecurityIdentity identity) {
        return identity == null || identity.isAnonymous() ? null : identity.getPrincipal().getName();
    }

    public boolean isReserved(String type) {
        return type != null && config.reserved().containsKey(type);
    }

    public int createDecorator(String principal, String namespace, String decoratorJson)
            throws NamespaceNotFoundException, ReservedDecoratorTypeException, DecoratorSchemaValidationException {
        JsonObject decorator = parse(decoratorJson);
        requireWriter(principal, typeOf(decorator));
        requireValid(decorator);
        return decoratorStore.createDecorator(namespace, decoratorJson);
    }

    /**
     * Updates a decorator in place, or, when the old or new type is reserved, stores a new decorator
     * that supersedes it (reserved types are append-only).
     *
     * @return the ID of the current decorator: {@code id}, or the new ID if the decorator was superseded
     */
    public int updateDecorator(String principal, String namespace, int id, String decoratorJson)
            throws NamespaceNotFoundException, DecoratorNotFoundException, DecoratorSupersededException,
            ReservedDecoratorTypeException, DecoratorSchemaValidationException {
        JsonObject decorator = parse(decoratorJson);
        Optional<Decorator> existing = decoratorStore.getDecoratorById(namespace, id);
        if (existing.isPresent()) {
            requireWriter(principal, existing.get().getType());
        }
        String type = typeOf(decorator);
        requireWriter(principal, type);
        requireValid(decorator);
        if (existing.isPresent() && (isReserved(existing.get().getType()) || isReserved(type))) {
            return decoratorStore.supersedeDecorator(namespace, id, decoratorJson);
        }
        if (existing.isPresent() && decoratorStore.getDecoratorHistory(namespace, id).stream()
                .anyMatch(entry -> entry.getId() == id && entry.getSupersededBy() != null)) {
            throw new DecoratorSupersededException();
        }
        // A missing decorator is left to the store, which reports it in its own way (GitHub mode: 501).
        decoratorStore.updateDecorator(namespace, id, decoratorJson);
        return id;
    }

    public void deleteDecorator(String principal, String namespace, int id)
            throws NamespaceNotFoundException, DecoratorNotFoundException, ReservedDecoratorTypeException {
        Optional<Decorator> existing = decoratorStore.getDecoratorById(namespace, id);
        if (existing.isPresent()) {
            requireWriter(principal, existing.get().getType());
            for (var entry : decoratorStore.getDecoratorHistory(namespace, id)) {
                requireWriter(principal, entry.getDecorator().getType());
            }
        }
        decoratorStore.deleteDecorator(namespace, id);
    }

    private void requireWriter(String principal, String type) throws ReservedDecoratorTypeException {
        if (!isReserved(type)) {
            return;
        }
        List<String> writers = config.reserved().get(type).writers();
        if (principal == null || !writers.contains(principal)) {
            throw new ReservedDecoratorTypeException(type);
        }
    }

    private void requireValid(JsonObject decorator) throws DecoratorSchemaValidationException {
        List<DecoratorSchemaError> errors = schemaValidator.validate(decorator);
        if (!errors.isEmpty()) {
            throw new DecoratorSchemaValidationException(errors);
        }
    }

    private static JsonObject parse(String decoratorJson) {
        if (decoratorJson == null) {
            throw new JsonParseException("Decorator JSON must be a JSON object");
        }
        try {
            return new JsonObject(decoratorJson);
        } catch (DecodeException | ClassCastException e) {
            throw new JsonParseException("Decorator JSON must be a JSON object");
        }
    }

    private static String typeOf(JsonObject decorator) {
        return decorator.getValue("type") instanceof String type ? type : null;
    }
}
