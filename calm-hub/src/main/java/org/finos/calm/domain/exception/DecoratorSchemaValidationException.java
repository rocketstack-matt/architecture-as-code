package org.finos.calm.domain.exception;

import org.finos.calm.domain.DecoratorSchemaError;

import java.util.List;

/**
 * A decorator does not match its {@code $schema}. It keeps the first {@value #MAX_ERRORS} errors, as the MCP
 * tool input check does, because the caller controls how many there are.
 */
public class DecoratorSchemaValidationException extends Exception {
    public static final int MAX_ERRORS = 20;

    private final List<DecoratorSchemaError> errors;
    private final int moreErrors;

    public DecoratorSchemaValidationException(List<DecoratorSchemaError> errors) {
        super("Decorator does not match its $schema");
        this.errors = List.copyOf(errors.subList(0, Math.min(errors.size(), MAX_ERRORS)));
        this.moreErrors = errors.size() - this.errors.size();
    }

    public List<DecoratorSchemaError> getErrors() {
        return errors;
    }

    /**
     * @return how many errors there are after the ones that {@link #getErrors()} returns
     */
    public int getMoreErrors() {
        return moreErrors;
    }
}
