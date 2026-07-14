package org.finos.calm.store.util;

/**
 * Outcome of a Nitrite store's shared find→mutate→splice→persist sequence on a
 * single resource document inside its namespace document. Callers map the
 * non-{@link #UPDATED} outcomes onto their own domain exceptions, which differ
 * per operation (e.g. a missing namespace document is a namespace error for a
 * thumbnail write but a resource error for a version update).
 */
public enum NitriteDocumentMutationResult {
    /** The document was mutated and the namespace document persisted. */
    UPDATED,
    /** No namespace document exists in the collection; nothing was written. */
    NAMESPACE_DOCUMENT_MISSING,
    /** The namespace document has no resource with the requested id; nothing was written. */
    RESOURCE_MISSING,
    /** The mutation declined to proceed (returned false); nothing was written. */
    ABORTED
}
