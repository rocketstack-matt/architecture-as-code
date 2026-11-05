package org.finos.calm.domain.exception;

import org.finos.calm.domain.DecoratorSchemaError;

import java.util.List;

public class DecoratorSchemaValidationException extends Exception {
    private final List<DecoratorSchemaError> errors;

    public DecoratorSchemaValidationException(List<DecoratorSchemaError> errors) {
        super("Decorator does not match its $schema");
        this.errors = List.copyOf(errors);
    }

    public List<DecoratorSchemaError> getErrors() {
        return errors;
    }
}
