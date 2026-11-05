package org.finos.calm.extensions;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.config.PropertiesConfigSource;
import io.smallrye.config.SmallRyeConfig;
import io.smallrye.config.SmallRyeConfigBuilder;
import org.finos.calm.config.ExtensionsConfig;
import org.finos.calm.domain.audit.AuditAction;
import org.finos.calm.domain.audit.AuditEntityType;
import org.finos.calm.domain.audit.AuditLogEntry;
import org.finos.calm.domain.audit.AuditOutcome;
import org.finos.calm.domain.extensions.ExtensionManifest;
import org.finos.calm.domain.extensions.ExtensionManifest.Route;
import org.finos.calm.security.AuditService;
import org.finos.calm.security.CalmHubPermissionChecker;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.Principal;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Flow;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TestExtensionProxyServiceShould {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    static final ExtensionManifest MANIFEST = new ExtensionManifest("team-services", "1.0.0", 0, "Team services",
            null, null, List.of(
            new Route("screen", "GET", "/screen", "authenticated", false),
            new Route("services", "GET", "/namespaces/{namespace}/services", "read", false),
            new Route("add-service", "POST", "/namespaces/{namespace}/services", "write", false),
            new Route("search", "POST", "/search", "authenticated", true)),
            null, null);

    @TempDir
    Path tempDir;

    private final FixtureBackend backend = new FixtureBackend();
    private final ExtensionRegistry registry = mock(ExtensionRegistry.class);
    private final CalmHubPermissionChecker permissions = mock(CalmHubPermissionChecker.class);
    private final AuditService auditService = mock(AuditService.class);
    private final SecurityIdentity alice = identity("alice");
    private ExtensionProxyService service;

    @BeforeEach
    void setup() {
        ExtensionTestKeys.KeyFiles keys = ExtensionTestKeys.rsa(tempDir, "hub");
        SmallRyeConfig config = new SmallRyeConfigBuilder()
                .withMapping(ExtensionsConfig.class)
                .withSources(new PropertiesConfigSource(Map.of(
                        "calm.extensions.identity.private-key-location", keys.privateKey().toString(),
                        "calm.extensions.identity.public-key-locations", keys.publicKey().toString(),
                        "calm.hub.base-url", "https://hub.example.com"), "test", 100))
                .build();
        ExtensionIdentitySigner signer = new ExtensionIdentitySigner(config.getConfigMapping(ExtensionsConfig.class),
                config, registry);
        signer.load();
        service = new ExtensionProxyService(registry, signer, permissions, auditService, "oidc");
        when(permissions.canRead(any(), any())).thenReturn(true);
        when(permissions.canWrite(any(), any())).thenReturn(true);
        register(backend.url("/base"), limits(1024, 1024, Duration.ofSeconds(5)));
    }

    @AfterEach
    void teardown() {
        backend.close();
    }

    @Test
    void send_a_get_with_the_assertion_and_the_canonical_query() throws IOException {
        backend.reply(new FixtureBackend.Reply(200, Map.of(
                "Content-Type", "application/json; charset=utf-8",
                "ETag", "\"v1\"",
                "Cache-Control", "no-store",
                "Set-Cookie", "session=x",
                "Location", "https://evil.example.com",
                "X-Backend", "internal"), "{\"services\":[]}".getBytes(StandardCharsets.UTF_8), 0));

        ExtensionProxyResponse reply = service.call(alice, request("GET", "/namespaces/finos.payments/services",
                "tag=b&q=x&tag=a", null));

        FixtureBackend.Received received = backend.received();
        assertThat(received.method(), is("GET"));
        assertThat(received.pathAndQuery(), is("/base/namespaces/finos.payments/services?q=x&tag=b&tag=a"));
        assertThat(received.header("Accept"), is("application/json"));
        assertThat(received.header("Accept-Language"), is("en-GB"));
        assertThat(received.header("Authorization"), nullValue());
        assertThat(received.header("Cookie"), nullValue());
        JsonNode claims = claims(received.header("X-Calm-Hub-Identity"));
        assertThat(claims.get("iss").asText(), is("https://hub.example.com"));
        assertThat(claims.get("sub").asText(), is("alice"));
        assertThat(claims.get("aud").asText(), is("team-services"));
        assertThat(claims.get("auth").asText(), is("oidc"));
        assertThat(claims.get("route").asText(), is("services"));
        assertThat(claims.get("scope").asText(), is("read"));
        assertThat(claims.get("ns").asText(), is("finos.payments"));
        assertThat(claims.get("htm").asText(), is("GET"));
        assertThat(claims.get("htp").asText(), is("/namespaces/finos.payments/services?q=x&tag=b&tag=a"));
        assertThat(reply.status(), is(200));
        assertThat(new String(reply.body(), StandardCharsets.UTF_8), is("{\"services\":[]}"));
        assertThat(reply.headers(), equalTo(Map.of(
                "Content-Type", "application/json; charset=utf-8", "Cache-Control", "no-store", "ETag", "\"v1\"")));
    }

    @Test
    void send_a_post_body_with_its_content_type() {
        backend.reply(new FixtureBackend.Reply(204, Map.of(), new byte[0], 0));

        ExtensionProxyResponse reply = service.call(alice, request("POST", "/search", null, "{\"q\":\"pay\"}"));

        assertThat(backend.received().method(), is("POST"));
        assertThat(backend.received().body(), is("{\"q\":\"pay\"}"));
        assertThat(backend.received().header("Content-Type"), is("application/json"));
        assertThat(reply.status(), is(204));
        assertThat(reply.body().length, is(0));
    }

    @Test
    void pass_on_a_client_error_from_the_backend() {
        backend.reply(FixtureBackend.Reply.json(404, "{\"error\":\"no such team\"}"));

        assertThat(service.call(alice, request("GET", "/screen", null, null)).status(), is(404));
    }

    @Test
    void refuse_an_unknown_extension_route_or_method() {
        assertThat(status(new ExtensionProxyRequest("missing", "GET", "/screen", null, null, null, null, null)), is(404));
        assertThat(status(request("GET", "/admin", null, null)), is(404));
        assertThat(status(request("DELETE", "/screen", null, null)), is(405));
        assertThat(status(request("GET", "/%2e%2e/admin", null, null)), is(400));
        assertThat(backend.received(), nullValue());
    }

    @Test
    void refuse_a_request_body_over_the_cap() {
        assertThat(status(request("POST", "/search", null, "x".repeat(1025))), is(413));
        assertThat(backend.received(), nullValue());
    }

    @Test
    void refuse_a_header_value_with_a_line_break() {
        ExtensionProxyRequest request = new ExtensionProxyRequest("team-services", "GET", "/screen", null, null,
                "application/json\r\nX-Injected: 1", null, null);

        assertThat(status(request), is(400));
    }

    @Test
    void return_502_for_a_reply_over_the_cap() {
        backend.reply(FixtureBackend.Reply.json(200, "[" + "1,".repeat(600) + "1]"));

        assertThat(status(request("GET", "/screen", null, null)), is(502));
    }

    @Test
    void return_502_for_a_server_error_a_redirect_or_a_login_challenge() {
        for (int code : List.of(500, 503, 302, 401, 407)) {
            backend.reply(new FixtureBackend.Reply(code, Map.of("Content-Type", "application/json",
                    "Location", backend.url("/elsewhere").toString()), "{}".getBytes(StandardCharsets.UTF_8), 0));

            assertThat(String.valueOf(code), status(request("GET", "/screen", null, null)), is(502));
            assertThat(backend.received().pathAndQuery(), is("/base/screen"));
        }
    }

    @Test
    void return_502_for_a_content_type_that_is_not_allowed() {
        backend.reply(new FixtureBackend.Reply(200, Map.of("Content-Type", "text/html"),
                "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8), 0));
        assertThat(status(request("GET", "/screen", null, null)), is(502));

        backend.reply(new FixtureBackend.Reply(200, Map.of(), "untyped".getBytes(StandardCharsets.UTF_8), 0));
        assertThat(status(request("GET", "/screen", null, null)), is(502));
    }

    @Test
    void return_504_when_the_backend_is_slow() {
        register(backend.url("/base"), limits(1024, 1024, Duration.ofMillis(300)));
        backend.reply(new FixtureBackend.Reply(200, Map.of("Content-Type", "application/json"),
                "{}".getBytes(StandardCharsets.UTF_8), 2000));

        ExtensionProxyException e = assertThrows(ExtensionProxyException.class,
                () -> service.call(alice, request("GET", "/screen", null, null)));

        assertThat(e.status(), is(504));
        assertThat(e.getMessage(), is("The extension did not reply in time"));
    }

    @Test
    void return_502_when_the_backend_is_down() {
        register(URI.create("http://localhost:" + FixtureBackend.freePort()), limits(1024, 1024, Duration.ofSeconds(5)));

        ExtensionProxyException e = assertThrows(ExtensionProxyException.class,
                () -> service.call(alice, request("GET", "/screen", null, null)));

        assertThat(e.status(), is(502));
        assertThat(e.getMessage(), is("The extension failed"));
    }

    @Test
    void name_the_auth_mode() {
        SmallRyeConfig authOn = new SmallRyeConfigBuilder()
                .withSources(new PropertiesConfigSource(Map.of("calm.auth.enabled", "true"), "test", 100)).build();
        SmallRyeConfig authOff = new SmallRyeConfigBuilder().build();

        assertThat(ExtensionProxyService.authMode(authOff, false), is("none"));
        assertThat(ExtensionProxyService.authMode(authOn, false), is("oidc"));
        assertThat(ExtensionProxyService.authMode(authOn, true), is("proxy"));
    }

    @Test
    void check_the_scope_with_the_namespace_from_the_path_only() {
        when(permissions.canRead(any(), any())).thenReturn(false);
        when(permissions.canRead(alice, "finos.payments")).thenReturn(true);

        service.call(alice, request("GET", "/namespaces/finos.payments/services", "namespace=finos.other", null));
        assertThat(status(request("GET", "/namespaces/finos.other/services", "namespace=finos.payments", null)), is(403));

        verify(permissions).canRead(alice, "finos.other");
    }

    @Test
    void refuse_a_namespace_that_is_not_valid_before_any_check() {
        assertThat(status(request("GET", "/namespaces/a%20b/services", null, null)), is(400));
        verify(permissions, never()).canRead(any(), any());
    }

    @Test
    void return_401_for_an_anonymous_or_missing_caller() {
        SecurityIdentity anonymous = mock(SecurityIdentity.class);
        when(anonymous.isAnonymous()).thenReturn(true);

        assertThat(assertThrows(ExtensionProxyException.class,
                () -> service.call(anonymous, request("GET", "/screen", null, null))).status(), is(401));
        assertThat(assertThrows(ExtensionProxyException.class,
                () -> service.call(null, request("GET", "/screen", null, null))).status(), is(401));
        assertThat(backend.received(), nullValue());
    }

    @Test
    void check_global_admin_and_domain_scopes_with_the_permission_checker() {
        ExtensionManifest manifest = new ExtensionManifest("team-services", "1.0.0", 0, "Team services", null, null,
                List.of(new Route("admin", "GET", "/admin", "global_admin", false),
                        new Route("domain", "PUT", "/domains/{domain}/services", "domain_write", false),
                        new Route("domain-admin", "DELETE", "/domains/{domain}/services", "domain_admin", false),
                        new Route("domain-read", "GET", "/domains/{domain}/services", "domain_read", false),
                        new Route("ns-admin", "DELETE", "/namespaces/{namespace}/services", "admin", false)),
                null, null);
        when(registry.find("team-services")).thenReturn(Optional.of(new RegisteredExtension(manifest, 0,
                Optional.of(backend.url("/base")), limits(1024, 1024, Duration.ofSeconds(5)))));

        assertThat(status(request("GET", "/admin", null, null)), is(403));
        assertThat(status(request("PUT", "/domains/payments/services", null, null)), is(403));
        assertThat(status(request("DELETE", "/domains/payments/services", null, null)), is(403));
        assertThat(status(request("GET", "/domains/payments/services", null, null)), is(403));
        assertThat(status(request("DELETE", "/namespaces/finos/services", null, null)), is(403));
        verify(permissions).hasGlobalAdmin(alice);
        verify(permissions).canWriteByDomain(alice, "payments");
        verify(permissions).allowDomainAdmin(alice, "payments");
        verify(permissions).canReadByDomain(alice, "payments");
        verify(permissions).allowNamespaceAdmin(alice, "finos");

        when(permissions.hasGlobalAdmin(alice)).thenReturn(true);
        assertThat(service.call(alice, request("GET", "/admin", null, null)).status(), is(200));
    }

    @Test
    void allow_only_get_and_read_only_routes_on_a_read_only_hub() {
        when(registry.isReadOnly()).thenReturn(true);

        assertThat(status(request("POST", "/namespaces/finos/services", null, "{}")), is(405));
        assertThat(service.call(alice, request("POST", "/search", null, "{}")).status(), is(200));
        assertThat(service.call(alice, request("GET", "/screen", null, null)).status(), is(200));
    }

    @Test
    void audit_a_write_route_with_the_extension_route_and_jti() throws IOException {
        service.call(alice, request("POST", "/namespaces/finos/services", null, "{\"name\":\"x\"}"));

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditService).record(captor.capture());
        AuditLogEntry entry = captor.getValue();
        assertThat(entry.getEntityType(), is(AuditEntityType.EXTENSION));
        assertThat(entry.getAction(), is(AuditAction.CREATE));
        assertThat(entry.getOutcome(), is(AuditOutcome.SUCCESS));
        assertThat(entry.getActor(), is("alice"));
        assertThat(entry.getNamespace(), is("finos"));
        assertThat(entry.getEntityId(), is("team-services"));
        assertThat(entry.getRoute(), is("add-service"));
        assertThat(entry.getJti(), is(claims(backend.received().header("X-Calm-Hub-Identity")).get("jti").asText()));
    }

    @Test
    void audit_a_denied_write_and_not_a_read_only_route() {
        when(permissions.canWrite(any(), any())).thenReturn(false);

        assertThat(status(request("POST", "/namespaces/finos/services", null, "{}")), is(403));
        service.call(alice, request("POST", "/search", null, "{}"));

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditService).record(captor.capture());
        assertThat(captor.getValue().getOutcome(), is(AuditOutcome.DENIED));
        assertThat(captor.getValue().getJti(), nullValue());
        assertThat(captor.getValue().getRoute(), is("add-service"));
    }

    @Test
    void audit_an_uncertain_write_when_the_backend_failed() {
        backend.reply(FixtureBackend.Reply.json(500, "{}"));

        assertThat(status(request("POST", "/namespaces/finos/services", null, "{}")), is(502));
        assert_audit(AuditOutcome.UNKNOWN, "add-service");
    }

    @Test
    void audit_a_non_read_only_get() {
        service.call(alice, request("GET", "/screen", null, null));
        assert_audit(AuditOutcome.SUCCESS, "screen");
    }

    @ParameterizedTest
    @ValueSource(ints = {400, 404, 403})
    void audit_backend_client_errors(int status) {
        backend.reply(FixtureBackend.Reply.json(status, "{}"));
        assertThat(service.call(alice, request("POST", "/namespaces/finos/services", null, "{}")).status(), is(status));
        assert_audit(status == 403 ? AuditOutcome.DENIED : AuditOutcome.FAILURE, "add-service");
    }

    @Test
    void audit_an_uncertain_write_on_timeout() {
        register(backend.url("/base"), limits(1024, 1024, Duration.ofMillis(100)));
        backend.reply(new FixtureBackend.Reply(200, Map.of(), new byte[0], 500));
        assertThat(status(request("POST", "/namespaces/finos/services", null, "{}")), is(504));
        assert_audit(AuditOutcome.UNKNOWN, "add-service");
    }

    @Test
    void audit_an_uncertain_write_on_connection_error() {
        register(URI.create("http://localhost:" + FixtureBackend.freePort()), limits(1024, 1024, Duration.ofSeconds(1)));
        assertThat(status(request("POST", "/namespaces/finos/services", null, "{}")), is(502));
        assert_audit(AuditOutcome.UNKNOWN, "add-service");
    }

    @Test
    void audit_an_uncertain_write_on_oversized_response() {
        backend.reply(FixtureBackend.Reply.json(200, "x".repeat(2048)));
        assertThat(status(request("POST", "/namespaces/finos/services", null, "{}")), is(502));
        assert_audit(AuditOutcome.UNKNOWN, "add-service");
    }

    private void assert_audit(AuditOutcome outcome, String route) {
        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditService).record(captor.capture());
        assertThat(captor.getValue().getOutcome(), is(outcome));
        assertThat(captor.getValue().getEntityId(), is("team-services"));
        assertThat(captor.getValue().getRoute(), is(route));
        assertThat(captor.getValue().getJti() != null, is(true));
        if ("screen".equals(route)) {
            assertThat(captor.getValue().getAction(), is(AuditAction.READ));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"/services/%61dmin", "/services/%61%64%6Din",
            "/%73ervices/admin", "/services/%2561dmin", "/services/admin%252Fsecret"})
    void reject_encoded_literals_without_calling_the_backend(String path) {
        register_service_routes();
        assertThat(status(request("GET", path, null, null)), is(400));
        assertThat(backend.received(), nullValue());
    }

    @Test
    void preserve_the_protected_literal_scope() {
        register_service_routes();
        assertThat(status(request("GET", "/services/admin", null, null)), is(403));
        assertThat(backend.received(), nullValue());
    }

    @Test
    void forward_the_normalised_parameter_and_bind_it_in_the_assertion() throws IOException {
        register_service_routes();
        service.call(alice, request("GET", "/services/%62ob%3a%2fteam", null, null));
        assertThat(backend.received().pathAndQuery(), is("/base/services/bob%3A%2Fteam"));
        JsonNode assertion = claims(backend.received().header("X-Calm-Hub-Identity"));
        assertThat(assertion.get("route").asText(), is("service"));
        assertThat(assertion.get("htp").asText(), is("/services/bob%3A%2Fteam"));
    }

    private void register_service_routes() {
        ExtensionManifest manifest = new ExtensionManifest("team-services", "1.0.0", 0, "Team services", null, null,
                List.of(new Route("service", "GET", "/services/{service}", "authenticated", false),
                        new Route("admin", "GET", "/services/admin", "global_admin", false)), null, null);
        when(registry.find("team-services")).thenReturn(Optional.of(new RegisteredExtension(manifest, 0,
                Optional.of(backend.url("/base")), limits(1024, 1024, Duration.ofSeconds(5)))));
    }

    @Test
    void fail_the_capped_body_on_an_upstream_error_and_ignore_data_after_the_cap() {
        ExtensionProxyService.CappedBodySubscriber failed = new ExtensionProxyService.CappedBodySubscriber(4);
        failed.onError(new IOException("reset"));
        assertThat(failed.getBody().toCompletableFuture().isCompletedExceptionally(), is(true));

        ExtensionProxyService.CappedBodySubscriber capped = new ExtensionProxyService.CappedBodySubscriber(4);
        Flow.Subscription subscription = mock(Flow.Subscription.class);
        capped.onSubscribe(subscription);
        capped.onNext(List.of(ByteBuffer.wrap(new byte[5])));
        capped.onNext(List.of(ByteBuffer.wrap(new byte[1])));
        capped.onComplete();

        verify(subscription).cancel();
        assertThat(capped.getBody().toCompletableFuture().isCompletedExceptionally(), is(true));
    }

    static SecurityIdentity identity(String name) {
        SecurityIdentity identity = mock(SecurityIdentity.class);
        Principal principal = mock(Principal.class);
        when(identity.getPrincipal()).thenReturn(principal);
        when(principal.getName()).thenReturn(name);
        return identity;
    }

    private static ExtensionLimits limits(int maxRequestBytes, int maxResponseBytes, Duration requestTimeout) {
        return new ExtensionLimits(Duration.ofSeconds(2), requestTimeout, maxRequestBytes, maxResponseBytes);
    }

    private void register(URI backendUrl, ExtensionLimits limits) {
        RegisteredExtension extension = new RegisteredExtension(MANIFEST, 0, Optional.of(backendUrl), limits);
        when(registry.find("team-services")).thenReturn(Optional.of(extension));
    }

    private int status(ExtensionProxyRequest request) {
        return assertThrows(ExtensionProxyException.class, () -> service.call(alice, request)).status();
    }

    private static ExtensionProxyRequest request(String method, String path, String query, String body) {
        return new ExtensionProxyRequest("team-services", method, path, query,
                body == null ? null : "application/json", "application/json", "en-GB",
                body == null ? null : new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
    }

    private static JsonNode claims(String token) throws IOException {
        return MAPPER.readTree(Base64.getUrlDecoder().decode(token.split("\\.")[1]));
    }
}
