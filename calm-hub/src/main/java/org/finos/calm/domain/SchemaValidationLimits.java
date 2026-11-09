package org.finos.calm.domain;

/**
 * Limits on a schema check of caller input, which the caller controls the size of.
 */
public final class SchemaValidationLimits {
    /** Hub returns at most this many errors and says how many more there are. */
    public static final int MAX_ERRORS = 20;

    private SchemaValidationLimits() {
    }
}
