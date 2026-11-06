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
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestExtensionToolsShould {

    private static final List<ExtensionManifest> MANIFESTS =
            new ExtensionManifestLoader().loadDirectory(Path.of("src/test/resources/extensions-test/mcp"));
    private static final List<ExtensionTools.ExtensionTool> TOOLS = ExtensionTools.tools(MANIFESTS);

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
        return TOOLS.stream()
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
        assertThat(TOOLS.stream().map(ExtensionTools.ExtensionTool::name).toList(),
                contains("ext_mcp-test_add-service", "ext_mcp-test_annotate", "ext_mcp-test_get-service", "ext_mcp-test_list-services", "ext_mcp-test_remove-service",
                        "ext_mcp-test_search", "ext_mcp-test_service-names"));
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
        verify(toolManager, times(7)).newTool(names.capture());
        assertThat(names.getAllValues().getFirst(), is("ext_mcp-test_add-service"));
        verify(definition).setDescription("List the services that a namespace owns");
        verify(definition).setTitle("MCP test: list-services");
        verify(definition).setInputSchema(tool("list-services").command().input());
        verify(definition).setOutputSchema(tool("list-services").command().output());
        verify(definition).setOutputSchema(tool("service-names").outputSchema());
        verify(definition, times(7)).register();
    }

    @Test
    void publish_an_object_output_schema_as_it_is() {
        assertThat(tool("list-services").wrapsOutput(), is(false));
        assertThat(tool("list-services").outputSchema(), is(tool("list-services").command().output()));
    }

    @Test
    void wrap_an_output_schema_that_is_not_an_object_in_result() {
        Map<String, Object> schema = tool("service-names").outputSchema();

        assertThat(tool("service-names").wrapsOutput(), is(true));
        assertThat(schema.get("type"), is("object"));
        assertThat(schema.get("required"), is(List.of("result")));
        Map<?, ?> result = (Map<?, ?>) ((Map<?, ?>) schema.get("properties")).get("result");
        assertThat(result.get("$id"), is("https://calm.finos.org/calm-hub/extensions/mcp-test/commands/service-names/output.json"));
        assertThat(result.get("allOf"), is(List.of(Map.of("$ref", "#/$defs/names"))));
        assertThat(result.containsKey("$ref"), is(false));
        assertThat(((Map<?, ?>) result.get("$defs")).keySet(), contains("names", "name"));
    }

    @Test
    void move_a_ref_beside_an_id_into_all_of() {
        Map<String, Object> schema = Map.of(
                "type", "object",
                "$ref", "#/$defs/top",
                "properties", Map.of("$id", Map.of("$id", "a.json", "$ref", "#/$defs/b", "allOf", List.of(Map.of("type", "object")))),
                "$defs", Map.of("d", Map.of("$id", "urn:d", "$dynamicRef", "#m")),
                "default", Map.of("$id", "data", "$ref", "data"));

        Map<String, Object> moved = ExtensionTools.published(schema);

        assertThat(moved.get("$ref"), is("#/$defs/top"));
        assertThat(((Map<?, ?>) moved.get("properties")).get("$id"),
                is(Map.of("$id", "a.json", "allOf", List.of(Map.of("type", "object"), Map.of("$ref", "#/$defs/b")))));
        assertThat(((Map<?, ?>) moved.get("$defs")).get("d"), is(Map.of("$id", "urn:d", "allOf", List.of(Map.of("$dynamicRef", "#m")))));
        assertThat(moved.get("default"), is(Map.of("$id", "data", "$ref", "data")));
    }

    @Test
    void move_the_schema_dialect_to_the_wrapper() {
        ExtensionManifest.Route route = new ExtensionManifest.Route("r", "GET", "/r", "authenticated", false);
        Map<String, Object> output = Map.of("$schema", "https://json-schema.org/draft/2020-12/schema", "$id", "urn:out", "type", "string");
        ExtensionManifest manifest = new ExtensionManifest("x", "1.0.0", 0, "X", "X", "X", List.of(route),
                Map.of("c", new ExtensionManifest.Command("r", "C", Map.of("type", "object"), output, null, null)), null);

        Map<String, Object> schema = ExtensionTools.tools(List.of(manifest)).getFirst().outputSchema();

        assertThat(schema.get("$schema"), is("https://json-schema.org/draft/2020-12/schema"));
        assertThat(((Map<?, ?>) schema.get("properties")).get("result"), is(Map.of("$id", "urn:out", "type", "string")));
    }

    @Test
    void skip_a_command_whose_input_or_output_schema_has_a_remote_ref() {
        assertThat(TOOLS.stream().noneMatch(t -> t.commandName().startsWith("remote-")), is(true));
    }

    @Test
    void skip_a_command_whose_input_or_output_schema_is_not_valid_json_schema() {
        assertThat(TOOLS.stream().noneMatch(t -> t.commandName().startsWith("typo-") || t.commandName().equals("bad-keyword")),
                is(true));
    }

    @Test
    void accept_a_valid_schema() {
        assertThat(ExtensionTools.schemaError(Map.of("type", "object",
                "properties", Map.of("a", true, "b", Map.of("type", "integer", "minimum", 1)),
                "dependencies", Map.of("a", List.of("b")),
                "$defs", Map.of("d", Map.of("type", "string")))), nullValue());
    }

    @Test
    void name_a_property_schema_that_is_not_an_object_or_a_boolean() {
        assertThat(ExtensionTools.schemaError(Map.of("type", "object", "properties", Map.of("limit", "integer"))),
                is("/properties/limit: the value must be a schema (an object or a boolean)"));
        assertThat(ExtensionTools.schemaError(Map.of("items", Map.of("properties", Map.of("a/b", 1)))),
                is("/items/properties/a~1b: the value must be a schema (an object or a boolean)"));
        assertThat(ExtensionTools.schemaError(Map.of("allOf", List.of(Map.of(), "x"))),
                is("/allOf/1: the value must be a schema (an object or a boolean)"));
    }

    @Test
    void check_a_schema_against_the_meta_schema() {
        assertThat(ExtensionTools.schemaError(Map.of("type", "objekt")), startsWith("/type: "));
        assertThat(ExtensionTools.schemaError(Map.of("properties", Map.of("n", Map.of("minimum", "1")))),
                startsWith("/properties/n/minimum: "));
        assertThat(ExtensionTools.schemaError(Map.of("required", "name")), startsWith("/required: "));
    }

    @Test
    void skip_a_command_whose_schema_has_a_dangling_ref_a_java_only_pattern_or_another_dialect() {
        List<String> names = TOOLS.stream().map(ExtensionTools.ExtensionTool::commandName).toList();

        assertThat(names.stream().noneMatch(n -> n.startsWith("dangling-") || n.equals("ref-loop-output") || n.startsWith("java-pattern-")
                || n.equals("draft-07")), is(true));
        assertThat(names.contains("search"), is(true));
    }

    @Test
    void name_a_pattern_that_is_not_ecma_262() {
        assertThat(ExtensionTools.schemaError(Map.of("properties", Map.of("a", Map.of("type", "string", "pattern", "(?i)abc")))),
                startsWith("/properties/a/pattern: '(?i)abc' is not an ECMA-262 regular expression: "));
        assertThat(ExtensionTools.schemaError(Map.of("items", Map.of("patternProperties", Map.of("\\Aa", Map.of())))),
                startsWith("/items/patternProperties: the key '\\Aa' is not an ECMA-262 regular expression: "));
        assertThat(ExtensionTools.schemaError(Map.of("pattern", "^(?<a>[a-z]+)\\d{2,}$",
                "patternProperties", Map.of("^x-", Map.of()))), nullValue());
    }

    @Test
    void refuse_a_schema_of_another_dialect() {
        assertThat(ExtensionTools.schemaError(Map.of("$schema", "http://json-schema.org/draft-07/schema#", "type", "object")),
                is("/: it declares the $schema 'http://json-schema.org/draft-07/schema#', but CALM Hub supports only "
                        + "JSON Schema 2020-12 (https://json-schema.org/draft/2020-12/schema)"));
        assertThat(ExtensionTools.schemaError(Map.of("$defs", Map.of("d", Map.of("$id", "urn:d",
                "$schema", "https://json-schema.org/draft/2019-09/schema")))), startsWith("/$defs/d: it declares the $schema "));
        assertThat(ExtensionTools.schemaError(Map.of("$schema", "https://json-schema.org/draft/2020-12/schema")), nullValue());
        assertThat(ExtensionTools.schemaError(Map.of("$schema", "https://json-schema.org/draft/2020-12/schema#")), nullValue());
    }

    @Test
    void refuse_every_schema_when_the_meta_schemas_cannot_be_loaded() {
        assertThat(ExtensionTools.META_SCHEMAS, notNullValue());
        assertThat(ExtensionTools.metaSchemas("no-such-folder/"), nullValue());
        assertThat(ExtensionTools.schemaError(Map.of("type", "object"), null),
                is("CALM Hub cannot load the JSON Schema 2020-12 meta-schema"));
    }

    @Test
    void register_no_tools_when_the_meta_schemas_cannot_be_loaded() {
        extensionTools.metaSchemas = null;

        extensionTools.register();

        verifyNoInteractions(toolManager, registry);
    }

    @Test
    void find_the_local_refs_that_point_to_nothing() {
        String id = ExtensionTools.inputSchemaId("x", "c");
        Map<String, Object> defs = Map.of("a", Map.of("type", "string", "$anchor", "a"), "b", true,
                "l", Map.of("anyOf", List.of(Map.of(), true)), "e~/x", Map.of());

        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/a", "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/b", "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/l/anyOf/1", "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/e~0~1x", "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#a", "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("type", "object", "properties", Map.of("p", Map.of("$ref", "#"))), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("type", "object", "properties", Map.of("p", Map.of("$ref", ""))), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$dynamicRef", "#meta", "$dynamicAnchor", "meta"), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$id", "urn:in", "$ref", "urn:in#/$defs/a", "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "urn:e#/$defs/a",
                "$defs", Map.of("e", Map.of("$id", "urn:e", "$defs", defs))), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "urn:e#a",
                "$defs", Map.of("e", Map.of("$id", "urn:e", "$defs", defs))), id), nullValue());

        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/missing", "$defs", defs), id), is("#/$defs/missing"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#nope", "$defs", defs), id), is("#nope"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/a/type", "$defs", defs), id), is("#/$defs/a/type"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/l/anyOf/2", "$defs", defs), id), is("#/$defs/l/anyOf/2"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/l/anyOf/x", "$defs", defs), id), is("#/$defs/l/anyOf/x"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#$defs/a", "$defs", defs), id), is("#$defs/a"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("$id", "urn:in", "$ref", "urn:in#/x"), id), is("urn:in#/x"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("properties", Map.of("p", Map.of("$ref", "#/$defs/a"))), id),
                is("#/$defs/a"));
        // An anchor belongs to its schema resource: the root cannot use one of an embedded resource with #a.
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#a",
                "$defs", Map.of("e", Map.of("$id", "urn:e", "$defs", defs))), id), is("#a"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("$dynamicRef", "#meta"), id), is("#meta"));
    }

    @Test
    void find_the_refs_that_point_only_to_a_loop_of_refs() {
        String id = ExtensionTools.inputSchemaId("x", "c");
        Map<String, Object> node = Map.of("type", "object",
                "properties", Map.of("kids", Map.of("type", "array", "items", Map.of("$ref", "#/$defs/node"))));

        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "#/$defs/node", "$defs", Map.of("node", node)), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("properties", Map.of("a", Map.of("$ref", "#/$defs/b")),
                "$defs", Map.of("b", Map.of("$ref", "#/$defs/c"), "c", Map.of("type", "string"))), id), nullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("$ref", "urn:e#/$defs/b", "$defs", Map.of("e", Map.of("$id", "urn:e",
                "$defs", Map.of("b", Map.of("$ref", "#/$defs/c"), "c", Map.of())))), id), nullValue());

        assertThat(ExtensionTools.unresolvedRef(Map.of("properties", Map.of("x", Map.of("$ref", "#/properties/x"))), id),
                is("#/properties/x"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("properties", Map.of("a", Map.of("$ref", "#/$defs/b")),
                "$defs", Map.of("b", Map.of("$ref", "#/$defs/c"), "c", Map.of("$ref", "#/$defs/b"))), id), notNullValue());
        assertThat(ExtensionTools.unresolvedRef(Map.of("type", "object", "$ref", "#"), id), is("#"));
        assertThat(ExtensionTools.unresolvedRef(Map.of("properties", Map.of("a", Map.of("$ref", "#/$defs/b")),
                "$defs", Map.of("b", Map.of("$ref", "#/$defs/missing"))), id), notNullValue());
    }

    @Test
    void find_the_remote_refs_of_a_schema() {
        String id = ExtensionTools.inputSchemaId("x", "c");

        assertThat(ExtensionTools.remoteRef(Map.of("$ref", "#/$defs/a", "$defs", Map.of("a", Map.of())), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$ref", id + "#/$defs/a"), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$ref", ""), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$defs", Map.of("a", Map.of("$id", "a.json"))), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$ref", "a.json", "$defs", Map.of("a", Map.of("$id", "a.json"))), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$id", "urn:in", "$ref", "urn:in#/x"), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("const", Map.of("$ref", "https://example.com/a.json")), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("allOf", List.of(Map.of("$ref", "https://example.com/a.json"))), id),
                is("https://example.com/a.json"));
        assertThat(ExtensionTools.remoteRef(Map.of("$ref", "other.json"), id), is("other.json"));
        assertThat(ExtensionTools.remoteRef(Map.of("$dynamicRef", "urn:other#x"), id), is("urn:other#x"));
        assertThat(ExtensionTools.remoteRef(Map.of("$ref", "a b:c"), id), is("a b:c"));
    }

    @Test
    void resolve_local_refs_against_an_id_that_is_not_hierarchical() {
        String id = ExtensionTools.inputSchemaId("x", "c");
        Map<String, Object> defs = Map.of("a", Map.of("type", "string"));

        assertThat(ExtensionTools.remoteRef(Map.of("$id", "urn:example:in", "properties", Map.of("p", Map.of("$ref", "#/$defs/a")),
                "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$id", "tag:example.com,2026:in", "$ref", "#/$defs/a", "$defs", defs), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$id", "https://example.com/in.json", "$ref", "#/$defs/a", "$defs", defs), id),
                nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$defs", Map.of("e", Map.of("$id", "urn:example:e", "$ref", "#/$defs/a",
                "$defs", defs))), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$ref", "urn:example:e#/$defs/a", "$defs", Map.of("e", Map.of("$id", "urn:example:e",
                "$defs", defs))), id), nullValue());
        assertThat(ExtensionTools.remoteRef(Map.of("$id", "urn:example:in", "$ref", "other.json"), id), is("other.json"));
        assertThat(ExtensionTools.remoteRef(Map.of("$id", "urn:example:in", "$ref", "urn:example:other#/a"), id), is("urn:example:other#/a"));
        assertThat(ExtensionTools.remoteRef(Map.of("$id", "https://example.com/in.json", "$ref", "https://example.com/other.json"), id),
                is("https://example.com/other.json"));
    }

    @Test
    void check_the_refs_of_properties_named_like_data_keywords() {
        String id = ExtensionTools.inputSchemaId("x", "c");

        assertThat(ExtensionTools.remoteRef(Map.of("properties", Map.of("default", Map.of("$ref", "https://example.com/a.json"))), id),
                is("https://example.com/a.json"));
        assertThat(ExtensionTools.remoteRef(Map.of("$defs", Map.of("enum", Map.of("$ref", "https://example.com/b.json"))), id),
                is("https://example.com/b.json"));
        assertThat(ExtensionTools.remoteRef(Map.of("properties", Map.of("examples", Map.of("type", "array")),
                "examples", List.of(Map.of("$ref", "https://example.com/c.json"))), id), nullValue());
    }

    @Test
    void not_check_the_refs_in_unknown_keywords() {
        String id = ExtensionTools.inputSchemaId("x", "c");

        assertThat(ExtensionTools.remoteRef(Map.of("type", "string", "x-example", Map.of("$ref", "https://example.com/a.json"),
                "example", Map.of("$ref", "https://example.com/b.json")), id), nullValue());
        assertThat(tool("annotate"), notNullValue());
    }

    @Test
    void publish_boolean_subschemas_as_objects() {
        Map<String, Object> never = Map.of("not", Map.of());
        Map<String, Object> schema = Map.of(
                "type", "object",
                "properties", Map.of("a", true, "b", false, "c", Map.of("type", "array", "items", true, "uniqueItems", true)),
                "additionalProperties", false,
                "unevaluatedItems", false,
                "allOf", List.of(true, Map.of("not", false)),
                "$defs", Map.of("d", true),
                "dependencies", Map.of("a", List.of("b")),
                "readOnly", true,
                "x-flag", true,
                "const", true);

        Map<String, Object> published = ExtensionTools.published(schema);

        assertThat(published.get("properties"), is(Map.of("a", Map.of(), "b", never,
                "c", Map.of("type", "array", "items", Map.of(), "uniqueItems", true))));
        assertThat(published.get("additionalProperties"), is(false));
        assertThat(published.get("unevaluatedItems"), is(never));
        assertThat(published.get("allOf"), is(List.of(Map.of(), Map.of("not", never))));
        assertThat(published.get("$defs"), is(Map.of("d", Map.of())));
        assertThat(published.get("dependencies"), is(Map.of("a", List.of("b"))));
        assertThat(published.get("readOnly"), is(true));
        assertThat(published.get("x-flag"), is(true));
        assertThat(published.get("const"), is(true));
    }

    @Test
    void publish_and_check_a_command_with_boolean_subschemas() {
        ExtensionTools.ExtensionTool annotate = tool("annotate");

        assertThat(((Map<?, ?>) annotate.inputSchema().get("properties")).get("note"), is(Map.of()));
        assertThat(((Map<?, ?>) annotate.inputSchema().get("properties")).get("never"), is(Map.of("not", Map.of())));
        assertThat(((Map<?, ?>) annotate.outputSchema().get("properties")).get("hits"), is(Map.of()));
        ToolResponse response = extensionTools.call(annotate, Map.of("text", "a", "note", 1, "never", 2));
        assertThat(response.isError(), is(true));
        assertThat(text(response), containsString("/never"));
        verifyNoInteractions(proxyService);
    }

    @Test
    void register_no_tools_with_no_extensions() {
        when(registry.available()).thenReturn(List.of());

        extensionTools.register();

        verifyNoInteractions(toolManager);
    }

    @Test
    void register_no_tools_when_mcp_is_disabled() {
        extensionTools.mcpEnabled = false;

        extensionTools.register();

        verifyNoInteractions(toolManager, registry);
    }

    @Test
    void register_the_other_tools_when_one_cannot_be_registered() {
        when(registry.available()).thenReturn(MANIFESTS);
        when(toolManager.newTool(anyString())).thenReturn(definition);
        when(definition.register()).thenThrow(new ClassCastException("not a JsonObject")).thenReturn(null);

        extensionTools.register();

        verify(definition, times(7)).register();
        verify(toolManager).removeTool(TOOLS.get(0).name());
        verify(toolManager, times(1)).removeTool(anyString());
    }

    @Test
    void not_register_or_remove_a_tool_whose_name_is_already_taken() {
        when(toolManager.getTool("ext_mcp-test_search")).thenReturn(mock(ToolManager.ToolInfo.class));
        when(toolManager.newTool(anyString())).thenReturn(definition);

        extensionTools.register(List.of(tool("search"), tool("annotate")));

        verify(toolManager, never()).newTool("ext_mcp-test_search");
        verify(toolManager).newTool("ext_mcp-test_annotate");
        verify(definition, times(1)).register();
        verify(toolManager, never()).removeTool(anyString());
    }

    @Test
    void register_the_other_tools_when_a_failed_tool_cannot_be_removed() {
        when(toolManager.newTool(anyString())).thenReturn(definition);
        when(definition.register()).thenThrow(new ClassCastException("not a JsonObject")).thenReturn(null);
        when(toolManager.removeTool(anyString())).thenThrow(new IllegalStateException("gone"));

        extensionTools.register(List.of(tool("search"), tool("annotate")));

        verify(definition, times(2)).register();
    }

    @Test
    void skip_a_command_whose_input_schema_cannot_be_read_or_whose_route_is_not_declared() {
        ExtensionManifest.Route route = new ExtensionManifest.Route("r", "GET", "/r", "authenticated", false);
        Map<String, Object> input = Map.of("type", "object");
        ExtensionManifest manifest = new ExtensionManifest("bad", "1.0.0", 0, "B", "B", "B", List.of(route), Map.of(
                "unreadable", new ExtensionManifest.Command("r", "C", Map.of("type", "object", "$id", 5), null, null, null),
                "no-route", new ExtensionManifest.Command("missing", "C", input, null, null, null),
                "good", new ExtensionManifest.Command("r", "C", input, null, null, null)), null);

        assertThat(ExtensionTools.tools(List.of(manifest)).stream().map(ExtensionTools.ExtensionTool::name).toList(),
                contains("ext_bad_good"));
    }

    @Test
    void name_the_input_schema_when_it_cannot_be_read() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> ExtensionTools.InputSchema.of("x", "c", Map.of("type", new Object())));

        assertThat(e.getMessage(), startsWith("CALM Hub cannot read its input schema: "));
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
    void return_a_reply_that_is_not_an_object_in_result() {
        when(proxyService.call(any(), any())).thenReturn(reply(200, "[\"a\",\"b\"]"));

        ToolResponse response = extensionTools.call(tool("service-names"), Map.of("namespace", "finos"));

        assertThat(response.isError(), is(false));
        assertThat(response.structuredContent(), is(Map.of("result", List.of("a", "b"))));
        assertThat(text(response), is("{\"result\":[\"a\",\"b\"]}"));
    }

    @Test
    void return_a_null_reply_in_result() {
        when(proxyService.call(any(), any())).thenReturn(reply(200, "null"));

        ToolResponse response = extensionTools.call(tool("service-names"), Map.of("namespace", "finos"));

        assertThat(response.isError(), is(false));
        assertThat(text(response), is("{\"result\":null}"));
    }

    @Test
    void return_an_error_when_a_wrapped_reply_is_not_json() {
        when(proxyService.call(any(), any())).thenReturn(reply(200, "not json"));

        ToolResponse response = extensionTools.call(tool("service-names"), Map.of("namespace", "finos"));

        assertThat(response.isError(), is(true));
        assertThat(text(response), containsString("not the JSON that this command declares"));
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
    void keep_and_check_an_input_schema_with_a_urn_id_and_local_refs() {
        ExtensionManifest.Route route = new ExtensionManifest.Route("r", "GET", "/r", "authenticated", false);
        Map<String, Object> input = Map.of("$id", "urn:example:in", "type", "object",
                "properties", Map.of("p", Map.of("$ref", "#/$defs/a")), "$defs", Map.of("a", Map.of("type", "string")));
        ExtensionManifest manifest = new ExtensionManifest("x", "1.0.0", 0, "X", "X", "X", List.of(route),
                Map.of("c", new ExtensionManifest.Command("r", "C", input, null, null, null)), null);

        ExtensionTools.ExtensionTool urnTool = ExtensionTools.tools(List.of(manifest)).getFirst();
        ToolResponse response = extensionTools.call(urnTool, Map.of("p", 3));

        assertThat(response.isError(), is(true));
        assertThat(text(response), containsString("/p"));
        assertThat(Boolean.TRUE.equals(urnTool.inputValidator().validate(new JsonObject().put("p", "s")).getValid()), is(true));
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
