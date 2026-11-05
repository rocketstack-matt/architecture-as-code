package org.finos.calm.extensions;

import java.io.InputStream;

/**
 * One call to an extension route. {@code path} is the raw, percent-encoded path after
 * {@code /api/calm/extensions/<id>/api}, starting with {@code /}. {@code rawQuery} and the headers
 * can be null. {@code body} can be null, and is read up to the extension's size cap.
 */
public record ExtensionProxyRequest(
        String extensionId,
        String method,
        String path,
        String rawQuery,
        String contentType,
        String accept,
        String acceptLanguage,
        InputStream body
) {}
