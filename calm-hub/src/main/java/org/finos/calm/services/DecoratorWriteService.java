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
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.domain.exception.ReservedDecoratorTypeException;
import org.finos.calm.store.DecoratorStore;

import java.util.List;
import java.util.Optional;

/**
 * The write rules for decorators, shared by REST and MCP. A reserved type can only be written by
 * its configured principals, and a decorator whose {@code $schema} Hub knows must match it.
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

    public void updateDecorator(String principal, String namespace, int id, String decoratorJson)
            throws NamespaceNotFoundException, DecoratorNotFoundException, ReservedDecoratorTypeException,
            DecoratorSchemaValidationException {
        JsonObject decorator = parse(decoratorJson);
        Optional<Decorator> existing = decoratorStore.getDecoratorById(namespace, id);
        if (existing.isPresent()) {
            requireWriter(principal, existing.get().getType());
        }
        requireWriter(principal, typeOf(decorator));
        requireValid(decorator);
        // A missing decorator is left to the store, which reports it in its own way (GitHub mode: 501).
        decoratorStore.updateDecorator(namespace, id, decoratorJson);
    }

    public void deleteDecorator(String principal, String namespace, int id)
            throws NamespaceNotFoundException, DecoratorNotFoundException, ReservedDecoratorTypeException {
        Optional<Decorator> existing = decoratorStore.getDecoratorById(namespace, id);
        if (existing.isPresent()) {
            requireWriter(principal, existing.get().getType());
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
