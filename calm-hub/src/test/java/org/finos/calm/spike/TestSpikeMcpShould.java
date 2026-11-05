package org.finos.calm.spike;

import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Q3 (ADR 0014): tools registered at start up with ToolManager, called over streamable HTTP.
 * The handler reads the caller from the injected {@code SecurityIdentity}.
 */
@QuarkusTest
@TestProfile(SpikeProfile.class)
@WithTestResource(SpikeUpstream.class)
public class TestSpikeMcpShould {

    private static final AtomicInteger IDS = new AtomicInteger();
    private String session;

    @BeforeEach
    void initialize() {
        Response init = post("alice", null, request("initialize", new JsonObject()
                .put("protocolVersion", "2025-06-18")
                .put("capabilities", new JsonObject())
                .put("clientInfo", new JsonObject().put("name", "spike").put("version", "0"))));
        assertEquals(200, init.statusCode(), init.asString());
        session = init.header("Mcp-Session-Id");
        post("alice", session, new JsonObject().put("jsonrpc", "2.0").put("method", "notifications/initialized"));
    }

    @Test
    void list_the_registered_tools_with_their_schemas_and_hints() {
        // tools/list is paged (50 a page by default), so follow nextCursor.
        JsonArray tools = new JsonArray();
        int pages = 0;
        String cursor = null;
        do {
            JsonObject params = cursor == null ? new JsonObject() : new JsonObject().put("cursor", cursor);
            JsonObject result = rpc("alice", "tools/list", params).getJsonObject("result");
            tools.addAll(result.getJsonArray("tools"));
            cursor = result.getString("nextCursor");
            pages++;
        } while (cursor != null);
        List<String> names = tools.stream().map(t -> ((JsonObject) t).getString("name")).toList();
        System.out.println("[spike] tools/list pages: " + pages + ", order: " + names);

        JsonObject alpha = find(tools, "ext_alpha_whoami");
        assertEquals("object", alpha.getJsonObject("inputSchema").getString("type"));
        assertEquals(new JsonArray().add("namespace"), alpha.getJsonObject("inputSchema").getJsonArray("required"));
        assertNotNull(alpha.getJsonObject("outputSchema"));
        assertEquals(true, alpha.getJsonObject("annotations").getBoolean("readOnlyHint"));
        assertEquals(false, alpha.getJsonObject("annotations").getBoolean("destructiveHint"));
        assertNotNull(find(tools, "ext_zeta_whoami"));
        assertNotNull(find(tools, "listNamespaces"), "static @Tool methods still listed");
    }

    @Test
    void give_the_handler_the_identity_of_the_caller() {
        JsonObject result = call("alice", "{\"namespace\":\"spike\"}");
        System.out.println("[spike] alice result: " + result.encode());
        assertFalse(result.getBoolean("isError", false), result.encode());
        assertEquals("alice", result.getJsonObject("structuredContent").getString("principal"));
    }

    @Test
    void check_the_caller_on_each_request_not_once_per_session() {
        JsonObject result = call("bob", "{\"namespace\":\"spike\"}");
        System.out.println("[spike] bob on alice's session: " + result.encode());
        assertTrue(result.getBoolean("isError", false), result.encode());
        assertTrue(text(result).contains("bob cannot read spike"), result.encode());
    }

    @Test
    void reject_an_anonymous_call_in_the_handler() {
        Response response = post(null, session, request("tools/call", new JsonObject()
                .put("name", "ext_alpha_whoami").put("arguments", new JsonObject().put("namespace", "spike"))));
        System.out.println("[spike] anonymous: HTTP " + response.statusCode() + " " + response.asString());
        // /mcp has no HTTP auth policy in this profile, so the handler is the only check.
        assertEquals(200, response.statusCode());
        JsonObject result = body(response).getJsonObject("result");
        assertTrue(result.getBoolean("isError", false));
        assertEquals("Error: authentication required.", text(result));
    }

    @Test
    void pass_arguments_that_break_the_input_schema_to_the_handler() {
        JsonObject result = call("alice", "{\"namespace\":\"spike\",\"extra\":1}");
        System.out.println("[spike] extra argument: " + result.encode());
        assertFalse(result.getBoolean("isError", false),
                "the server does not validate arguments against setInputSchema; Hub must");
    }

    private JsonObject call(String user, String arguments) {
        JsonObject response = rpc(user, "tools/call", new JsonObject()
                .put("name", "ext_alpha_whoami").put("arguments", new JsonObject(arguments)));
        return response.getJsonObject("result");
    }

    private JsonObject rpc(String user, String method, JsonObject params) {
        Response response = post(user, session, request(method, params));
        assertEquals(200, response.statusCode(), response.asString());
        return body(response);
    }

    private static JsonObject request(String method, JsonObject params) {
        return new JsonObject().put("jsonrpc", "2.0").put("id", IDS.incrementAndGet())
                .put("method", method).put("params", params);
    }

    private static Response post(String user, String session, JsonObject message) {
        RequestSpecification spec = given()
                .contentType("application/json")
                .accept("application/json, text/event-stream")
                .body(message.encode());
        if (user != null) {
            spec.header(SpikeHeaderAuthMechanism.HEADER, user);
        }
        if (session != null) {
            spec.header("Mcp-Session-Id", session);
        }
        return spec.post("/mcp");
    }

    // A streamable-HTTP reply is either JSON or an SSE stream whose data line holds the JSON.
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
                .findFirst().orElse(null);
    }

    private static String text(JsonObject result) {
        return result.getJsonArray("content").getJsonObject(0).getString("text");
    }
}
