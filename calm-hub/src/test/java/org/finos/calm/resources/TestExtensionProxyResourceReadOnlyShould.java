package org.finos.calm.resources;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import org.eclipse.microprofile.config.ConfigProvider;
import org.finos.calm.extensions.ExtensionTestKeys;
import org.finos.calm.extensions.FixtureBackend;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
@TestProfile(TestExtensionProxyResourceReadOnlyShould.ReadOnlyProxyProfile.class)
class TestExtensionProxyResourceReadOnlyShould {

    private static final String BASE = "/api/calm/extensions/proxy-test/api";
    private static FixtureBackend backend;

    public static class ReadOnlyProxyProfile implements QuarkusTestProfile {
        private static final ExtensionTestKeys.KeyFiles KEYS = ExtensionTestKeys.rsaInTempDir();

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "calm.readonly", "true",
                    "calm.extensions.dir", "src/test/resources/extensions-test/proxy",
                    "calm.extensions.\"proxy-test\".backend-url", "http://localhost:" + FixtureBackend.freePort(),
                    "calm.extensions.identity.private-key-location", KEYS.privateKey().toString(),
                    "calm.extensions.identity.public-key-locations", KEYS.publicKey().toString());
        }
    }

    @BeforeAll
    static void startBackend() {
        String url = ConfigProvider.getConfig().getValue("calm.extensions.\"proxy-test\".backend-url", String.class);
        backend = new FixtureBackend(URI.create(url).getPort());
    }

    @AfterAll
    static void stopBackend() {
        backend.close();
    }

    @BeforeEach
    void resetBackend() {
        backend.reset();
    }

    @Test
    @TestSecurity(user = "alice")
    void allow_a_post_to_a_read_only_route() {
        given().contentType("application/json").body("{\"q\":\"pay\"}")
                .when().post(BASE + "/search")
                .then().statusCode(200);

        assertThat(backend.received().body(), is("{\"q\":\"pay\"}"));
    }

    @Test
    @TestSecurity(user = "alice")
    void refuse_a_write_route_and_every_other_write() {
        given().contentType("application/json").body("{}")
                .when().post(BASE + "/namespaces/finos/services")
                .then().statusCode(405)
                .body("error", equalTo("This CALM Hub instance is read-only"));
        given().contentType("application/json").body("{}")
                .when().post("/api/calm/namespaces")
                .then().statusCode(405);
        given().contentType("application/json").body("{}").urlEncodingEnabled(false)
                .when().post(BASE + "/../../namespaces")
                .then().statusCode(405);

        assertThat(backend.received(), nullValue());
    }
}
