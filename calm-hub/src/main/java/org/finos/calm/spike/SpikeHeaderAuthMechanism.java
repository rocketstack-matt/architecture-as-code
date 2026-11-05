package org.finos.calm.spike;

import io.quarkus.arc.properties.IfBuildProperty;
import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.request.TrustedAuthenticationRequest;
import io.quarkus.vertx.http.runtime.security.ChallengeData;
import io.quarkus.vertx.http.runtime.security.HttpAuthenticationMechanism;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

/**
 * Like {@code ProxyAuthenticationMechanism}, but not tied to the proxy-auth build profile, so
 * the spike can send a different user on each request. A request with no header is anonymous.
 */
@ApplicationScoped
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeHeaderAuthMechanism implements HttpAuthenticationMechanism {

    static final String HEADER = "X-Spike-User";

    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        String user = context.request().getHeader(HEADER);
        if (user == null || user.isBlank()) {
            return Uni.createFrom().optional(Optional.empty());
        }
        return identityProviderManager.authenticate(new TrustedAuthenticationRequest(user));
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        return Uni.createFrom().item(new ChallengeData(401, null, null));
    }
}
