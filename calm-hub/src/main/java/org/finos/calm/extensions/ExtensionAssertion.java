package org.finos.calm.extensions;

/**
 * The request-bound claims of one identity assertion (ADR 0010). Hub adds {@code iss}, {@code iat}
 * and {@code exp} when it signs. {@code ns} is null when the route has no {@code {namespace}}.
 */
public record ExtensionAssertion(
        String sub,
        String aud,
        String jti,
        String auth,
        int hubApi,
        String route,
        String scope,
        String ns,
        String htm,
        String htp
) {}
