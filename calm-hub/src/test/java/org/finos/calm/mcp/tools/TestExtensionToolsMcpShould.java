package org.finos.calm.mcp.tools;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import io.restassured.response.Response;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.eclipse.microprofile.config.ConfigProvider;
import org.finos.calm.domain.UserAccess;
import org.finos.calm.extensions.ExtensionTestKeys;
import org.finos.calm.extensions.FixtureBackend;
import org.finos.calm.store.UserAccessStore;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;

/** Extension commands as MCP tools, called over the streamable HTTP transport and the real proxy. */
@QuarkusTest
@TestProfile(TestExtensionToolsMcpShould.McpProfile.class)
class TestExtensionToolsMcpShould {

    private static final AtomicInteger IDS = new AtomicInteger();
    private static FixtureBackend backend;

    @InjectMock
    UserAccessStore mockUserAccessStore;

    public static class McpProfile implements QuarkusTestProfile {
        private static final ExtensionTestKeys.KeyFiles KEYS = ExtensionTestKeys.rsaInTempDir();

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "calm.mcp.enabled", "true",
                    "calm.extensions.dir", "src/test/resources/extensions-test/mcp",
                    "calm.extensions.\"mcp-test\".backend-url", "http://localhost:" + FixtureBackend.freePort(),
                    "calm.extensions.identity.private-key-location", KEYS.privateKey().toString(),
                    "calm.extensions.identity.public-key-locations", KEYS.publicKey().toString());
        }
    }

    @BeforeAll
    static void startBackend() {
        String url = ConfigProvider.getConfig().getValue("calm.extensions.\"mcp-test\".backend-url", String.class);
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
    void list_the_command_tools_sorted_with_their_schemas_and_hints() {
        JsonArray tools = listTools();
        List<String> names = tools.stream().map(t -> ((JsonObject) t).getString("name"))
                .filter(name -> name.startsWith("ext_")).toList();

        assertThat(names, is(List.of("ext_mcp-test_add-service", "ext_mcp-test_list-services",
                "ext_mcp-test_remove-service", "ext_mcp-test_search", "ext_mcp-test_service-names")));
        JsonObject list = find(tools, "ext_mcp-test_list-services");
        assertThat(list.getString("description"), is("List the services that a namespace owns"));
        assertThat(list.getString("title"), is("MCP test: list-services"));
        assertThat(list.getJsonObject("inputSchema").getJsonArray("required"), is(new JsonArray().add("namespace")));
        assertThat(list.getJsonObject("outputSchema").getString("type"), is("object"));
        assertThat(list.getJsonObject("annotations").getBoolean("readOnlyHint"), is(true));
        JsonObject remove = find(tools, "ext_mcp-test_remove-service");
        assertThat(remove.getJsonObject("annotations").getBoolean("readOnlyHint"), is(false));
        assertThat(remove.getJsonObject("annotations").getBoolean("destructiveHint"), is(true));
        assertThat(remove.getJsonObject("outputSchema"), nullValue());
        JsonObject wrapped = find(tools, "ext_mcp-test_service-names").getJsonObject("outputSchema");
        assertThat(wrapped.getString("type"), is("object"));
        JsonObject result = wrapped.getJsonObject("properties").getJsonObject("result");
        assertThat(result.containsKey("$ref"), is(false));
        assertThat(result.getJsonArray("allOf"), is(new JsonArray().add(new JsonObject().put("$ref", "#/$defs/names"))));
    }

    @Test
    @TestSecurity(user = "alice")
    void wrap_a_reply_that_is_not_an_object_in_result() {
        when(mockUserAccessStore.getGrantsForUser("alice"))
                .thenReturn(List.of(new UserAccess("alice", UserAccess.Permission.read, "finos")));
        backend.reply(FixtureBackend.Reply.json(200, "[\"payments\"]"));

        JsonObject result = callTool("ext_mcp-test_service-names", new JsonObject().put("namespace", "finos"));

        assertThat(result.encode(), result.getBoolean("isError", false), is(false));
        assertThat(result.getJsonObject("structuredContent"), is(new JsonObject().put("result", new JsonArray().add("payments"))));
        assertThat(new JsonObject(text(result)), is(result.getJsonObject("structuredContent")));
    }

    @Test
    @TestSecurity(user = "alice")
    void call_the_route_through_the_proxy_with_the_callers_identity() {
        when(mockUserAccessStore.getGrantsForUser("alice"))
                .thenReturn(List.of(new UserAccess("alice", UserAccess.Permission.read, "finos")));
        backend.reply(FixtureBackend.Reply.json(200, "{\"services\":[\"payments\"]}"));

        JsonObject result = callTool("ext_mcp-test_list-services", new JsonObject().put("namespace", "finos").put("limit", 2));

        assertThat(result.encode(), result.getBoolean("isError", false), is(false));
        assertThat(result.getJsonObject("structuredContent").getJsonArray("services"), is(new JsonArray().add("payments")));
        assertThat(new JsonObject(text(result)), is(result.getJsonObject("structuredContent")));
        FixtureBackend.Received received = backend.received();
        assertThat(received.method(), is("GET"));
        assertThat(received.pathAndQuery(), is("/namespaces/finos/services?limit=2"));
        assertThat(received.header("X-Calm-Hub-Identity"), notNullValue());
    }

    @Test
    @TestSecurity(user = "alice")
    void send_the_rest_of_the_input_as_the_body_of_a_write() {
        when(mockUserAccessStore.getGrantsForUser("alice"))
                .thenReturn(List.of(new UserAccess("alice", UserAccess.Permission.write, "finos")));
        backend.reply(FixtureBackend.Reply.json(201, "{\"id\":\"payments\"}"));

        JsonObject result = callTool("ext_mcp-test_add-service", new JsonObject().put("namespace", "finos")
                .put("service", new JsonObject().put("name", "payments")));

        assertThat(result.encode(), result.getBoolean("isError", false), is(false));
        FixtureBackend.Received received = backend.received();
        assertThat(received.method(), is("POST"));
        assertThat(received.pathAndQuery(), is("/namespaces/finos/services"));
        assertThat(new JsonObject(received.body()), is(new JsonObject().put("service", new JsonObject().put("name", "payments"))));
    }

    @Test
    @TestSecurity(user = "bob")
    void check_the_scope_when_the_tool_is_called() {
        when(mockUserAccessStore.getGrantsForUser("bob")).thenReturn(List.of());

        JsonObject result = callTool("ext_mcp-test_list-services", new JsonObject().put("namespace", "finos"));

        assertThat(result.getBoolean("isError"), is(true));
        assertThat(text(result), is("Error: You do not have the scope that this extension route needs"));
        assertThat(backend.received(), nullValue());
    }

    @Test
    void refuse_an_anonymous_call() {
        JsonObject result = callTool("ext_mcp-test_search", new JsonObject().put("text", "pay"));

        assertThat(result.getBoolean("isError"), is(true));
        assertThat(text(result), is("Error: Sign in to call this extension"));
        assertThat(backend.received(), nullValue());
    }

    @Test
    @TestSecurity(user = "alice")
    void refuse_input_that_does_not_match_the_schema() {
        JsonObject result = callTool("ext_mcp-test_list-services", new JsonObject().put("namespace", "finos").put("extra", 1));

        assertThat(result.getBoolean("isError"), is(true));
        assertThat(text(result), containsString("does not match the schema"));
        assertThat(backend.received(), nullValue());
    }

    private static JsonArray listTools() {
        JsonArray tools = new JsonArray();
        String cursor = null;
        do {
            JsonObject params = cursor == null ? new JsonObject() : new JsonObject().put("cursor", cursor);
            JsonObject result = rpc("tools/list", params).getJsonObject("result");
            tools.addAll(result.getJsonArray("tools"));
            cursor = result.getString("nextCursor");
        } while (cursor != null);
        return tools;
    }

    private static JsonObject callTool(String name, JsonObject arguments) {
        return rpc("tools/call", new JsonObject().put("name", name).put("arguments", arguments)).getJsonObject("result");
    }

    private static JsonObject rpc(String method, JsonObject params) {
        String session = initialize();
        Response response = post(session, new JsonObject().put("jsonrpc", "2.0").put("id", IDS.incrementAndGet())
                .put("method", method).put("params", params));
        assertThat(response.asString(), response.statusCode(), is(200));
        return body(response);
    }

    private static String initialize() {
        Response init = post(null, new JsonObject().put("jsonrpc", "2.0").put("id", IDS.incrementAndGet())
                .put("method", "initialize").put("params", new JsonObject()
                        .put("protocolVersion", "2025-06-18")
                        .put("capabilities", new JsonObject())
                        .put("clientInfo", new JsonObject().put("name", "test").put("version", "0"))));
        assertThat(init.asString(), init.statusCode(), is(200));
        String session = init.header("Mcp-Session-Id");
        post(session, new JsonObject().put("jsonrpc", "2.0").put("method", "notifications/initialized"));
        return session;
    }

    private static Response post(String session, JsonObject message) {
        var spec = given()
                .contentType("application/json")
                .accept("application/json, text/event-stream")
                .body(message.encode());
        if (session != null) {
            spec.header("Mcp-Session-Id", session);
        }
        return spec.post("/mcp");
    }

    // A streamable-HTTP reply is either JSON or an SSE stream whose last data line holds the JSON.
    private static JsonObject body(Response response) {
        String raw = response.asString();
        if (String.valueOf(response.contentType()).startsWith("text/event-stream")) {
            raw = raw.lines().filter(l -> l.startsWith("data:")).reduce((a, b) -> b)
                    .orElseThrow().substring("data:".length()).trim();
        }
        return new JsonObject(raw);
    }

    private static JsonObject find(JsonArray tools, String name) {
        return tools.stream().map(JsonObject.class::cast).filter(t -> name.equals(t.getString("name")))
                .findFirst().orElseThrow();
    }

    private static String text(JsonObject result) {
        return result.getJsonArray("content").getJsonObject(0).getString("text");
    }
}
