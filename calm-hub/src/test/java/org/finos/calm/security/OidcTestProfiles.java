package org.finos.calm.security;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.security.GeneralSecurityException;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.Map;

/**
 * The oidc and secure profiles, with a local public key in place of the identity provider, so that
 * Hub starts with no OIDC server.
 */
final class OidcTestProfiles {

    private OidcTestProfiles() {
    }

    static String publicKey() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return Base64.getEncoder().encodeToString(generator.generateKeyPair().getPublic().getEncoded());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    public static class Oidc implements QuarkusTestProfile {
        @Override
        public String getConfigProfile() {
            return "test,oidc";
        }

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "CALM_OIDC_ISSUER_URL", "https://idp.invalid/realms/calm",
                    "CALM_OIDC_CLIENT_ID", "calm-hub",
                    "quarkus.oidc.public-key", publicKey());
        }
    }

    public static class Secure implements QuarkusTestProfile {
        @Override
        public String getConfigProfile() {
            return "test,secure";
        }

        @Override
        public Map<String, String> getConfigOverrides() {
            // No TLS certificate in the tests, so serve plain http on the test port.
            return Map.of(
                    "quarkus.http.insecure-requests", "enabled",
                    "quarkus.http.ssl.certificate.files", "",
                    "quarkus.http.ssl.certificate.key-files", "",
                    "quarkus.oidc.public-key", publicKey());
        }
    }
}
