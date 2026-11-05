package org.finos.calm.security;

import io.quarkus.security.AuthenticationFailedException;
import io.quarkus.security.identity.IdentityProviderManager;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.ext.web.RoutingContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestExtensionAssertionRejectingMechanismShould {

    @Mock
    IdentityProviderManager mockIdentityProviderManager;

    @Mock
    RoutingContext mockRoutingContext;

    @Mock
    HttpServerRequest mockRequest;

    ExtensionAssertionRejectingMechanism mechanism;

    @BeforeEach
    void setUp() {
        mechanism = new ExtensionAssertionRejectingMechanism();
    }

    private static String token(String header) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(header.getBytes(StandardCharsets.UTF_8)) + ".e30.c2ln";
    }

    @ParameterizedTest
    @ValueSource(strings = {"Bearer ", "bearer ", "BEARER  "})
    void fail_a_request_that_presents_an_assertion(String scheme) {
        when(mockRoutingContext.request()).thenReturn(mockRequest);
        when(mockRequest.getHeader(any(CharSequence.class)))
                .thenReturn(scheme + token("{\"alg\":\"RS256\",\"typ\":\"calm-ext+jwt\"}"));

        assertThrows(AuthenticationFailedException.class, () ->
                mechanism.authenticate(mockRoutingContext, mockIdentityProviderManager).await().indefinitely());
        verifyNoInteractions(mockIdentityProviderManager);
    }

    @Test
    void leave_another_bearer_token_to_the_other_mechanisms() {
        when(mockRoutingContext.request()).thenReturn(mockRequest);
        when(mockRequest.getHeader(any(CharSequence.class))).thenReturn("Bearer " + token("{\"alg\":\"RS256\",\"typ\":\"JWT\"}"));

        assertNull(mechanism.authenticate(mockRoutingContext, mockIdentityProviderManager).await().indefinitely());
    }

    @Test
    void leave_a_request_with_no_authorization_to_the_other_mechanisms() {
        when(mockRoutingContext.request()).thenReturn(mockRequest);
        when(mockRequest.getHeader(any(CharSequence.class))).thenReturn(null);

        assertNull(mechanism.authenticate(mockRoutingContext, mockIdentityProviderManager).await().indefinitely());
    }

    @Test
    void run_before_the_other_mechanisms_and_set_no_challenge() {
        assertTrue(mechanism.getPriority() > new NoAuthAuthenticationMechanism().getPriority());
        assertNull(mechanism.getChallenge(mockRoutingContext).await().indefinitely());
    }
}
