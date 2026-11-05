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
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.oneOf;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
@TestProfile(TestExtensionProxyResourceShould.ProxyProfile.class)
class TestExtensionProxyResourceShould {

    static final String CSP = "sandbox; default-src 'none'";
    private static final String BASE = "/api/calm/extensions/proxy-test/api";
    private static FixtureBackend backend;

    public static class ProxyProfile implements QuarkusTestProfile {
        private static final ExtensionTestKeys.KeyFiles KEYS = ExtensionTestKeys.rsaInTempDir();

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "calm.extensions.dir", "src/test/resources/extensions-test/proxy",
                    "calm.extensions.\"proxy-test\".backend-url", "http://localhost:" + FixtureBackend.freePort() + "/base",
                    "calm.extensions.identity.private-key-location", KEYS.privateKey().toString(),
                    "calm.extensions.identity.public-key-locations", KEYS.publicKey().toString());
        }
    }

    @BeforeAll
    static void startBackend() {
        // Read back from the running Hub: the profile can be loaded more than once, each time with a new port.
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
    void proxy_a_declared_route_with_the_content_security_policy() {
        backend.reply(new FixtureBackend.Reply(200, Map.of("Content-Type", "application/json", "Set-Cookie", "a=b"),
                "{\"blocks\":[]}".getBytes(StandardCharsets.UTF_8), 0));

        given()
                .header("Cookie", "session=secret")
                .header("Remote-User", "mallory")
                .header("X-Forwarded-For", "10.0.0.1")
                .when()
                .get(BASE + "/screen?b=2&a=1")
                .then()
                .statusCode(200)
                .header("Content-Security-Policy", CSP)
                .header("Set-Cookie", nullValue())
                .header("X-Content-Type-Options", "nosniff")
                .body("blocks.size()", equalTo(0));

        FixtureBackend.Received received = backend.received();
        assertThat(received.pathAndQuery(), is("/base/screen?a=1&b=2"));
        assertThat(received.header("X-Calm-Hub-Identity"), notNullValue());
        assertThat(received.header("Cookie"), nullValue());
        assertThat(received.header("Remote-User"), nullValue());
        assertThat(received.header("X-Forwarded-For"), nullValue());
        assertThat(received.header("Authorization"), nullValue());
    }

    @Test
    @TestSecurity(user = "alice")
    void return_a_generic_json_error_with_the_policy() {
        given()
                .when()
                .get(BASE + "/not-declared")
                .then()
                .statusCode(404)
                .header("Content-Security-Policy", CSP)
                .body("error", equalTo("The extension has no such route"));

        given()
                .when()
                .get("/api/calm/extensions/missing/api/screen")
                .then()
                .statusCode(404)
                .body("error", equalTo("There is no such extension"));
    }

    @Test
    @TestSecurity(user = "alice")
    void refuse_an_encoded_path_that_could_leave_the_route() {
        for (String path : new String[]{"/%2e%2e/admin", "/screen%2f..%2fadmin", "/%252e%252e/admin", "/@evil.example.com"}) {
            int status = given()
                    .urlEncodingEnabled(false)
                    .when()
                    .get(BASE + path)
                    .then()
                    .extract().statusCode();

            assertThat(path, status, oneOf(400, 404));
        }
        assertThat(backend.received(), nullValue());
    }

    @Test
    @TestSecurity(user = "alice")
    void return_502_with_a_generic_body_when_the_backend_fails() {
        backend.reply(FixtureBackend.Reply.json(500, "{\"stack\":\"secret internals\"}"));

        given()
                .when()
                .get(BASE + "/screen")
                .then()
                .statusCode(502)
                .body("error", equalTo("The extension failed"));
    }

    @Test
    void return_401_when_not_authenticated() {
        given()
                .when()
                .get(BASE + "/screen")
                .then()
                .statusCode(401);

        assertThat(backend.received(), nullValue());
    }
}
