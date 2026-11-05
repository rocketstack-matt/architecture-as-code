package org.finos.calm.extensions;

import org.finos.calm.domain.extensions.ExtensionManifest;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Matches a checked path against the declared route templates only (ADR 0011). A {@code {name}}
 * segment matches one non-empty segment. When two templates match, the one with more literal
 * segments wins, as in JAX-RS.
 */
final class ExtensionRouteMatcher {

    /** The matched route, and its path parameters in their raw, percent-encoded form. */
    record RouteMatch(ExtensionManifest.Route route, Map<String, String> parameters) {}

    private ExtensionRouteMatcher() {
    }

    static RouteMatch match(ExtensionManifest manifest, String method, String path) {
        RouteMatch best = null;
        int bestLiterals = -1;
        boolean pathMatched = false;
        for (ExtensionManifest.Route route : manifest.routes()) {
            Optional<Map<String, String>> parameters = parameters(route.path(), path);
            if (parameters.isEmpty()) {
                continue;
            }
            pathMatched = true;
            int literals = route.path().split("/", -1).length - parameters.get().size();
            if (route.method().equals(method) && literals > bestLiterals) {
                best = new RouteMatch(route, parameters.get());
                bestLiterals = literals;
            }
        }
        if (best != null) {
            return best;
        }
        throw pathMatched
                ? new ExtensionProxyException(405, "The extension route does not allow this method")
                : new ExtensionProxyException(404, "The extension has no such route");
    }

    static void rejectEncodedLiterals(RouteMatch match, String rawPath) {
        String[] template = match.route().path().split("/", -1);
        String[] raw = rawPath.split("/", -1);
        for (int i = 0; i < template.length; i++) {
            if (!template[i].startsWith("{") && raw[i].contains("%")) {
                throw new ExtensionProxyException(400, "Percent-encoding is not allowed in route literals");
            }
        }
    }

    static Optional<Map<String, String>> parameters(String template, String path) {
        String[] templateSegments = template.split("/", -1);
        String[] pathSegments = path.split("/", -1);
        if (templateSegments.length != pathSegments.length) {
            return Optional.empty();
        }
        Map<String, String> parameters = new LinkedHashMap<>();
        for (int i = 0; i < templateSegments.length; i++) {
            String segment = templateSegments[i];
            if (segment.length() > 2 && segment.startsWith("{") && segment.endsWith("}")) {
                if (pathSegments[i].isEmpty()) {
                    return Optional.empty();
                }
                parameters.put(segment.substring(1, segment.length() - 1), pathSegments[i]);
            } else if (!segment.equals(pathSegments[i])) {
                return Optional.empty();
            }
        }
        return Optional.of(parameters);
    }
}
