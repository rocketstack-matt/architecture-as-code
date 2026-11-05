package org.finos.calm.extensions;

/**
 * A proxied call that Hub refused or that the backend failed. The message is generic and safe to
 * return: it never holds the request path, the backend URL or the backend reply.
 */
public class ExtensionProxyException extends RuntimeException {

    private final int status;

    public ExtensionProxyException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int status() {
        return status;
    }
}
