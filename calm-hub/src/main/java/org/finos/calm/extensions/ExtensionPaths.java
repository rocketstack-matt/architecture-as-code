package org.finos.calm.extensions;

import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Checks a caller-supplied path and query and builds the backend URI from them (ADR 0011). Each
 * check works on the raw, percent-encoded form, so that an encoded or double-encoded form cannot
 * hide a dot segment or user info. Encoded slashes stay encoded within a route parameter.
 */
final class ExtensionPaths {

    private static final List<String> FORBIDDEN = List.of("..", "%2e", "%5c", "%25", "%40", "\\", "//", "@");

    private ExtensionPaths() {
    }

    /** Returns the path when it is safe to send to a backend, or throws 400. */
    static String checkPath(String rawPath) {
        if (rawPath == null || !rawPath.startsWith("/") || !printableAscii(rawPath, "?#")) {
            throw badRequest();
        }
        String lower = rawPath.toLowerCase(Locale.ROOT);
        if (FORBIDDEN.stream().anyMatch(lower::contains) || encodesControlCharacter(lower)) {
            throw badRequest();
        }
        for (String segment : rawPath.split("/", -1)) {
            if (segment.equals(".")) {
                throw badRequest();
            }
        }
        try {
            if (!URI.create("http://h" + rawPath).normalize().getRawPath().equals(rawPath)) {
                throw badRequest();
            }
        } catch (IllegalArgumentException e) {
            throw badRequest();
        }
        return normalise(rawPath);
    }

    private static String normalise(String path) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < path.length(); i++) {
            char c = path.charAt(i);
            if (c == '%') {
                char decoded = (char) Integer.parseInt(path.substring(i + 1, i + 3), 16);
                if ((decoded >= 'a' && decoded <= 'z') || (decoded >= 'A' && decoded <= 'Z')
                        || (decoded >= '0' && decoded <= '9') || "-._~".indexOf(decoded) >= 0) {
                    result.append(decoded);
                } else {
                    result.append(path.substring(i, i + 3).toUpperCase(Locale.ROOT));
                }
                i += 2;
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }

    /**
     * Sorts the parameters by name, and keeps the order of the values of one name, because the CLI
     * sends an array as a repeated name. Empty parameters are dropped. Returns "" for no query.
     */
    static String canonicalQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isEmpty()) {
            return "";
        }
        if (!printableAscii(rawQuery, "#") || encodesControlCharacter(rawQuery.toLowerCase(Locale.ROOT))) {
            throw badRequest();
        }
        List<String> parameters = new ArrayList<>();
        for (String parameter : rawQuery.split("&")) {
            if (!parameter.isEmpty()) {
                parameters.add(parameter);
            }
        }
        parameters.sort(Comparator.comparing(ExtensionPaths::name));
        return String.join("&", parameters);
    }

    /**
     * Resolves {@code pathAndQuery} under the backend URL with {@link URI#resolve}, then checks that
     * the scheme, host, port and base path are still those of the backend.
     */
    static URI resolve(URI backend, String pathAndQuery) {
        String basePath = backend.getRawPath() == null || backend.getRawPath().isEmpty() ? "/" : backend.getRawPath();
        if (!basePath.endsWith("/")) {
            basePath = basePath + "/";
        }
        try {
            URI base = backend.resolve(basePath);
            // "./" keeps a first segment with a colon from being read as a scheme.
            URI target = base.resolve("." + pathAndQuery);
            if (target.getScheme() == null || !target.getScheme().equalsIgnoreCase(backend.getScheme())
                    || target.getHost() == null || !target.getHost().equalsIgnoreCase(backend.getHost())
                    || port(target) != port(backend) || target.getRawUserInfo() != null
                    || target.getRawFragment() != null || target.getRawPath() == null
                    || !target.getRawPath().startsWith(basePath)) {
                throw badRequest();
            }
            return target;
        } catch (IllegalArgumentException e) {
            throw badRequest();
        }
    }

    private static String name(String parameter) {
        int equals = parameter.indexOf('=');
        return equals < 0 ? parameter : parameter.substring(0, equals);
    }

    private static int port(URI uri) {
        if (uri.getPort() != -1) {
            return uri.getPort();
        }
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }

    private static boolean printableAscii(String value, String forbidden) {
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c <= 0x20 || c >= 0x7f || forbidden.indexOf(c) >= 0) {
                return false;
            }
        }
        return true;
    }

    private static boolean encodesControlCharacter(String lower) {
        return lower.matches(".*%([01][0-9a-f]|7f).*");
    }

    private static ExtensionProxyException badRequest() {
        return new ExtensionProxyException(400, "The extension path or query is not allowed");
    }
}
