package org.finos.calm.security;

import io.netty.handler.codec.http.HttpHeaderNames;
import io.quarkus.security.AuthenticationFailedException;
import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.vertx.http.runtime.security.ChallengeData;
import io.quarkus.vertx.http.runtime.security.HttpAuthenticationMechanism;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import org.finos.calm.extensions.ExtensionIdentitySigner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Hub never accepts its own extension identity assertion as a credential (ADR 0010). An extension
 * calls Hub with its own service account. This mechanism runs before the others, in every auth
 * mode, and fails a request whose bearer token has the assertion {@code typ}. It never supplies an
 * identity itself.
 */
@ApplicationScoped
public class ExtensionAssertionRejectingMechanism implements HttpAuthenticationMechanism {

    private static final Logger logger = LoggerFactory.getLogger(ExtensionAssertionRejectingMechanism.class);
    private static final String BEARER = "bearer ";

    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        String authorization = context.request().getHeader(HttpHeaderNames.AUTHORIZATION);
        if (authorization != null && authorization.regionMatches(true, 0, BEARER, 0, BEARER.length())
                && ExtensionIdentitySigner.isAssertion(authorization.substring(BEARER.length()).trim())) {
            logger.warn("REJECTING a CALM Hub extension identity assertion presented as a credential");
            return Uni.createFrom().failure(new AuthenticationFailedException());
        }
        return Uni.createFrom().nullItem();
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        // The other mechanisms set the challenge, as they did before this one was added.
        return Uni.createFrom().nullItem();
    }

    @Override
    public int getPriority() {
        return DEFAULT_PRIORITY + 1000;
    }
}
