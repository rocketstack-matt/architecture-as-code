package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.ToolManager;
import io.quarkiverse.mcp.server.ToolResponse;
import io.quarkus.security.identity.SecurityIdentity;
import io.vertx.core.json.JsonObject;
import org.finos.calm.domain.extensions.ExtensionManifest;
import org.finos.calm.extensions.ExtensionManifestLoader;
import org.finos.calm.extensions.ExtensionProxyException;
import org.finos.calm.extensions.ExtensionProxyRequest;
import org.finos.calm.extensions.ExtensionProxyResponse;
import org.finos.calm.extensions.ExtensionProxyService;
import org.finos.calm.extensions.ExtensionRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestExtensionToolsShould {

    private static final List<ExtensionManifest> MANIFESTS =
            new ExtensionManifestLoader().loadDirectory(Path.of("src/test/resources/extensions-test/mcp"));

    @Mock(answer = Answers.RETURNS_SELF)
    ToolManager.ToolDefinition definition;

    @Mock
    ToolManager toolManager;

    @Mock
    ExtensionRegistry registry;

    @Mock
    ExtensionProxyService proxyService;

    @Mock
    SecurityIdentity identity;

    @InjectMocks
    ExtensionTools extensionTools;

    @BeforeEach
    void setup() {
        extensionTools.mcpEnabled = true;
    }

    private static String text(ToolResponse r) {
        return r.firstContent().asText().text();
    }

    private static ExtensionTools.ExtensionTool tool(String command) {
        return ExtensionTools.tools(MANIFESTS).stream()
                .filter(t -> t.commandName().equals(command))
                .findFirst().orElseThrow();
    }

    private static String body(ExtensionProxyRequest request) throws IOException {
        return new String(request.body().readAllBytes(), StandardCharsets.UTF_8);
    }

    private static ExtensionProxyResponse reply(int status, String body) {
        return new ExtensionProxyResponse(status, Map.of("Content-Type", "application/json"), body.getBytes(StandardCharsets.UTF_8));
    }

    // --- registration ---

    @Test
    void name_the_tools_after_the_extension_and_command_sorted_by_name() {
        assertThat(ExtensionTools.tools(MANIFESTS).stream().map(ExtensionTools.ExtensionTool::name).toList(),
                contains("ext_mcp-test_add-service", "ext_mcp-test_list-services", "ext_mcp-test_remove-service",
                        "ext_mcp-test_search"));
    }

    @Test
    void sort_the_tools_of_all_extensions_together() {
        ExtensionManifest.Route route = new ExtensionManifest.Route("r", "GET", "/r", "authenticated", false);
        Map<String, Object> input = Map.of("type", "object");
        ExtensionManifest zeta = new ExtensionManifest("zeta", "1.0.0", 0, "Z", "Z", "Z", List.of(route),
                Map.of("a", new ExtensionManifest.Command("r", "A", input, null, null, null)), null);
        ExtensionManifest alpha = new ExtensionManifest("alpha", "1.0.0", 0, "A", "A", "A", List.of(route),
                Map.of("z", new ExtensionManifest.Command("r", "Z", input, null, null, null)), null);

        assertThat(ExtensionTools.tools(List.of(zeta, alpha)).stream().map(ExtensionTools.ExtensionTool::name).toList(),
                contains("ext_alpha_z", "ext_zeta_a"));
    }

    @Test
    void register_each_tool_with_its_schemas_and_hints() {
        when(registry.available()).thenReturn(MANIFESTS);
        when(toolManager.newTool(anyString())).thenReturn(definition);

        extensionTools.register();

        ArgumentCaptor<String> names = ArgumentCaptor.forClass(String.class);
        verify(toolManager, times(4)).newTool(names.capture());
        assertThat(names.getAllValues().getFirst(), is("ext_mcp-test_add-service"));
        verify(definition).setDescription("List the services that a namespace owns");
        verify(definition).setTitle("MCP test: list-services");
        verify(definition).setInputSchema(tool("list-services").command().input());
        verify(definition).setOutputSchema(tool("list-services").command().output());
        verify(definition, times(4)).register();
    }

    @Test
    void register_no_tools_with_no_extensions() {
        when(registry.available()).thenReturn(List.of());

        extensionTools.register();

        verifyNoInteractions(toolManager);
    }

    @Test
    void stop_hub_for_an_input_schema_that_cannot_be_read() {
        ExtensionManifest.Route route = new ExtensionManifest.Route("r", "GET", "/r", "authenticated", false);
        ExtensionManifest manifest = new ExtensionManifest("bad", "1.0.0", 0, "B", "B", "B", List.of(route),
                Map.of("c", new ExtensionManifest.Command("r", "C", Map.of("type", "object", "$id", 5), null, null, null)), null);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> ExtensionTools.tools(List.of(manifest)));
        assertThat(e.getMessage(), containsString("Extension bad command 'c' has an input schema"));
    }

    @Test
    void mark_a_get_or_read_only_route_as_read_only() {
        ToolManager.ToolAnnotations list = ExtensionTools.annotations(tool("list-services"));
        ToolManager.ToolAnnotations search = ExtensionTools.annotations(tool("search"));

        assertThat(list.readOnlyHint(), is(true));
        assertThat(list.destructiveHint(), is(false));
        assertThat(list.idempotentHint(), is(true));
        assertThat(search.readOnlyHint(), is(true));
        assertThat(search.destructiveHint(), is(false));
    }

    @Test
    void take_the_write_hints_from_the_manifest() {
        ToolManager.ToolAnnotations add = ExtensionTools.annotations(tool("add-service"));
        ToolManager.ToolAnnotations remove = ExtensionTools.annotations(tool("remove-service"));

        assertThat(add.readOnlyHint(), is(false));
        assertThat(add.destructiveHint(), is(false));
        assertThat(add.idempotentHint(), is(false));
        assertThat(remove.destructiveHint(), is(true));
        assertThat(remove.idempotentHint(), is(true));
        assertThat(remove.openWorldHint(), is(true));
    }

    @Test
    void use_the_mcp_defaults_for_a_write_with_no_hints() {
        ExtensionManifest.Route route = new ExtensionManifest.Route("r", "POST", "/r", "authenticated", false);
        ExtensionManifest manifest = new ExtensionManifest("x", "1.0.0", 0, "X", "X", "X", List.of(route),
                Map.of("c", new ExtensionManifest.Command("r", "C", Map.of("type", "object"), null, null, null)), null);

        ToolManager.ToolAnnotations hints = ExtensionTools.annotations(ExtensionTools.tools(List.of(manifest)).getFirst());

        assertThat(hints.destructiveHint(), is(true));
        assertThat(hints.idempotentHint(), is(false));
    }

    // --- request mapping ---

    @Test
    void fill_the_path_and_send_the_rest_as_the_query_for_get() {
        ExtensionProxyRequest request = ExtensionTools.request(tool("list-services"),
                new JsonObject("{\"namespace\":\"finos\",\"limit\":5,\"tag\":[\"a b\",\"c\"]}"));

        assertThat(request.extensionId(), is("mcp-test"));
        assertThat(request.method(), is("GET"));
        assertThat(request.path(), is("/namespaces/finos/services"));
        assertThat(request.rawQuery(), is("limit=5&tag=a%20b&tag=c"));
        assertThat(request.body(), nullValue());
    }

    @Test
    void send_an_object_or_null_in_the_query_as_json() {
        ExtensionProxyRequest request = ExtensionTools.request(tool("remove-service"),
                new JsonObject("{\"namespace\":\"finos\",\"name\":\"svc\",\"filter\":{\"a\":1},\"none\":null}"));

        assertThat(request.method(), is("DELETE"));
        assertThat(request.path(), is("/namespaces/finos/services/svc"));
        assertThat(request.rawQuery(), is("filter=%7B%22a%22%3A1%7D&none=null"));
    }

    @Test
    void send_no_query_when_the_path_takes_every_property() {
        ExtensionProxyRequest request = ExtensionTools.request(tool("list-services"), new JsonObject("{\"namespace\":\"finos\"}"));

        assertThat(request.rawQuery(), nullValue());
    }

    @Test
    void send_the_rest_as_a_json_body_for_post() throws IOException {
        ExtensionProxyRequest request = ExtensionTools.request(tool("add-service"),
                new JsonObject("{\"namespace\":\"finos\",\"service\":{\"name\":\"svc\"}}"));

        assertThat(request.method(), is("POST"));
        assertThat(request.path(), is("/namespaces/finos/services"));
        assertThat(request.contentType(), is("application/json"));
        assertThat(body(request), is("{\"service\":{\"name\":\"svc\"}}"));
    }

    @Test
    void encode_a_path_value_so_it_cannot_add_a_segment() {
        ExtensionProxyRequest request = ExtensionTools.request(tool("remove-service"),
                new JsonObject("{\"namespace\":\"finos\",\"name\":\"../a/b?c#d é\"}"));

        assertThat(request.path(), is("/namespaces/finos/services/..%2Fa%2Fb%3Fc%23d%20%C3%A9"));
    }

    @Test
    void refuse_a_dot_segment_in_the_path() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> ExtensionTools.request(
                tool("remove-service"), new JsonObject("{\"namespace\":\"finos\",\"name\":\"..\"}")));

        assertThat(e.getMessage(), containsString("must not be . or .."));
    }

    @Test
    void refuse_an_object_in_the_path() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> ExtensionTools.request(
                tool("remove-service"), new JsonObject("{\"namespace\":\"finos\",\"name\":{}}")));

        assertThat(e.getMessage(), containsString("must be a string, number or boolean"));
    }

    // --- call ---

    @Test
    void return_the_structured_reply_of_a_command_with_an_output_schema() {
        when(proxyService.call(any(), any())).thenReturn(reply(200, "{\"services\":[\"a\"]}"));

        ToolResponse response = extensionTools.call(tool("list-services"), Map.of("namespace", "finos"));

        assertThat(response.isError(), is(false));
        assertThat(response.structuredContent(), is(Map.of("services", List.of("a"))));
        assertThat(text(response), is("{\"services\":[\"a\"]}"));
        ArgumentCaptor<ExtensionProxyRequest> request = ArgumentCaptor.forClass(ExtensionProxyRequest.class);
        verify(proxyService).call(same(identity), request.capture());
        assertThat(request.getValue().path(), is("/namespaces/finos/services"));
    }

    @Test
    void return_the_reply_as_text_for_a_command_with_no_output_schema() {
        when(proxyService.call(any(), any())).thenReturn(reply(200, "{\"hits\":3}"));

        ToolResponse response = extensionTools.call(tool("search"), Map.of("text", "pay"));

        assertThat(response.isError(), is(false));
        assertThat(text(response), is("{\"hits\":3}"));
    }

    @Test
    void return_an_error_when_the_reply_is_not_the_declared_object() {
        when(proxyService.call(any(), any())).thenReturn(reply(200, "[1]"));

        ToolResponse response = extensionTools.call(tool("list-services"), Map.of("namespace", "finos"));

        assertThat(response.isError(), is(true));
        assertThat(text(response), containsString("not the JSON object"));
    }

    @Test
    void return_an_error_with_the_body_of_a_client_error_reply() {
        when(proxyService.call(any(), any())).thenReturn(reply(404, "{\"error\":\"no such service\"}"));

        ToolResponse response = extensionTools.call(tool("search"), Map.of("text", "pay"));

        assertThat(response.isError(), is(true));
        assertThat(text(response), is("Error: The extension replied with status 404: {\"error\":\"no such service\"}"));
    }

    @Test
    void return_an_error_with_no_body_for_an_empty_reply() {
        when(proxyService.call(any(), any())).thenReturn(reply(409, ""));

        ToolResponse response = extensionTools.call(tool("search"), Map.of("text", "pay"));

        assertThat(text(response), is("Error: The extension replied with status 409."));
    }

    @Test
    void return_the_proxy_error_when_hub_refuses_the_call() {
        when(proxyService.call(any(), any()))
                .thenThrow(new ExtensionProxyException(403, "You do not have the scope that this extension route needs"));

        ToolResponse response = extensionTools.call(tool("list-services"), Map.of("namespace", "finos"));

        assertThat(response.isError(), is(true));
        assertThat(text(response), is("Error: You do not have the scope that this extension route needs"));
    }

    @Test
    void refuse_input_that_does_not_match_the_schema() {
        ToolResponse response = extensionTools.call(tool("list-services"), Map.of("namespace", "finos", "limit", 0, "extra", 1));

        assertThat(response.isError(), is(true));
        assertThat(text(response), startsWith("Error: The input does not match the schema of this command:"));
        assertThat(text(response), containsString("/limit"));
        verifyNoInteractions(proxyService);
    }

    @Test
    void resolve_a_local_ref_in_the_input_schema() {
        ToolResponse response = extensionTools.call(tool("add-service"), Map.of("namespace", "finos", "service", Map.of("name", "")));

        assertThat(response.isError(), is(true));
        assertThat(text(response), containsString("/service/name"));
        verifyNoInteractions(proxyService);
    }

    @Test
    void refuse_missing_arguments() {
        ToolResponse response = extensionTools.call(tool("search"), null);

        assertThat(response.isError(), is(true));
        assertThat(text(response), startsWith("Error: The input does not match the schema"));
    }

    @Test
    void return_a_mapping_error_without_calling_the_extension() {
        ToolResponse response = extensionTools.call(tool("remove-service"), Map.of("namespace", "finos", "name", "."));

        assertThat(text(response), containsString("must not be . or .."));
        verify(proxyService, never()).call(any(), any());
    }

    @Test
    void return_disabled_error_when_mcp_is_disabled() {
        extensionTools.mcpEnabled = false;

        ToolResponse response = extensionTools.call(tool("search"), Map.of("text", "pay"));

        assertThat(text(response), is(McpValidationHelper.MCP_DISABLED_MESSAGE));
        verifyNoInteractions(proxyService);
    }
}
