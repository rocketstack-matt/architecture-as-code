package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.TextContent;
import io.quarkiverse.mcp.server.ToolManager;
import io.quarkiverse.mcp.server.ToolResponse;
import io.quarkus.runtime.StartupEvent;
import io.quarkus.security.identity.SecurityIdentity;
import io.vertx.core.json.DecodeException;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.json.schema.Draft;
import io.vertx.json.schema.JsonSchema;
import io.vertx.json.schema.JsonSchemaOptions;
import io.vertx.json.schema.OutputFormat;
import io.vertx.json.schema.OutputUnit;
import io.vertx.json.schema.SchemaRepository;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.interceptor.Interceptor;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.finos.calm.domain.extensions.ExtensionManifest;
import org.finos.calm.extensions.ExtensionManifestLoader;
import org.finos.calm.extensions.ExtensionProxyException;
import org.finos.calm.extensions.ExtensionProxyRequest;
import org.finos.calm.extensions.ExtensionProxyResponse;
import org.finos.calm.extensions.ExtensionProxyService;
import org.finos.calm.extensions.ExtensionRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.UnaryOperator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Registers one MCP tool for each extension command at start up (ADR 0014). Each call goes through
 * {@link ExtensionProxyService}, so the scope, read-only, audit and limit rules of the REST proxy
 * apply. Tools are not hidden from callers who lack the scope: the proxy checks it on each call.
 */
@ApplicationScoped
public class ExtensionTools {

    private static final Logger logger = LoggerFactory.getLogger(ExtensionTools.class);
    private static final Pattern PATH_PARAM = Pattern.compile("\\{([^}]+)}");
    private static final String SCHEMA_BASE = "https://calm.finos.org/calm-hub/extensions/";
    private static final String RESULT = "result";
    // Keywords whose value is a schema or a list of schemas. Other keywords, also unknown ones such as x-example, are data.
    private static final Set<String> SCHEMA_KEYWORDS = Set.of("additionalProperties", "additionalItems", "items",
            "prefixItems", "contains", "propertyNames", "not", "if", "then", "else", "allOf", "anyOf", "oneOf",
            "unevaluatedItems", "unevaluatedProperties", "contentSchema");
    // Hub keeps these as booleans: clients read them, and some, such as strict function calling, require false.
    private static final Set<String> BOOLEAN_KEYWORDS = Set.of("additionalProperties", "unevaluatedProperties");
    // Keywords whose value maps names to schemas.
    private static final Set<String> SCHEMA_MAPS = Set.of("properties", "patternProperties", "$defs", "definitions",
            "dependentSchemas", "dependencies");
    private static final String META_SCHEMA_BASE = "https://json-schema.org/draft/2020-12/";
    private static final String META_SCHEMA = META_SCHEMA_BASE + "schema";
    // Bundled in vertx-json-schema under this classpath folder.
    private static final String META_SCHEMA_PATH = "json-schema.org/draft/2020-12/";
    private static final List<String> META_SCHEMA_FILES = List.of("schema", "meta/core", "meta/applicator",
            "meta/unevaluated", "meta/validation", "meta/meta-data", "meta/format-annotation", "meta/content");
    private static final JsonSchemaOptions META_SCHEMA_OPTIONS = new JsonSchemaOptions()
            .setDraft(Draft.DRAFT202012)
            .setBaseUri(META_SCHEMA)
            .setOutputFormat(OutputFormat.Basic);
    static final SchemaRepository META_SCHEMAS = metaSchemas(META_SCHEMA_PATH);

    /** One command with what its handler needs. */
    record ExtensionTool(String name, String extensionId, String extensionName, String commandName,
                         ExtensionManifest.Command command, ExtensionManifest.Route route, InputSchema inputValidator) {

        boolean readOnly() {
            return "GET".equals(route.method()) || route.readOnly();
        }

        /** MCP requires an object output schema, so Hub wraps any other output in {@code result}. */
        boolean wrapsOutput() {
            return command.output() != null && !"object".equals(command.output().get("type"));
        }

        Map<String, Object> inputSchema() {
            return published(command.input());
        }

        Map<String, Object> outputSchema() {
            if (!wrapsOutput()) {
                return published(command.output());
            }
            Map<String, Object> result = new LinkedHashMap<>(command.output());
            Map<String, Object> schema = new LinkedHashMap<>();
            schema.put("type", "object");
            Object draft = result.remove("$schema");
            if (draft != null) {
                schema.put("$schema", draft);
            }
            // Its own $id keeps the local $refs of the output schema pointing into it.
            result.putIfAbsent("$id", outputSchemaId(extensionId, commandName));
            schema.put("properties", Map.of(RESULT, result));
            schema.put("required", List.of(RESULT));
            return published(schema);
        }
    }

    @Inject
    @ConfigProperty(name = "calm.mcp.enabled", defaultValue = "false")
    boolean mcpEnabled;

    @Inject
    ToolManager toolManager;

    @Inject
    ExtensionRegistry registry;

    @Inject
    ExtensionProxyService proxyService;

    @Inject
    SecurityIdentity identity;

    SchemaRepository metaSchemas = META_SCHEMAS;

    // After ExtensionRegistry has loaded the manifests on the same event.
    void onStartup(@Observes @Priority(Interceptor.Priority.APPLICATION + 1000) StartupEvent event) {
        register();
    }

    void register() {
        if (!mcpEnabled) {
            return;
        }
        if (metaSchemas == null) {
            logger.error("CALM Hub registers no MCP tools for extension commands, because it cannot check their schemas");
            return;
        }
        register(tools(registry.available()));
    }

    void register(List<ExtensionTool> tools) {
        List<String> registered = new ArrayList<>();
        for (ExtensionTool tool : tools) {
            if (toolManager.getTool(tool.name()) != null) {
                logger.warn("Extension {} command '{}' has no MCP tool: a tool named {} already exists",
                        tool.extensionId(), tool.commandName(), tool.name());
                continue;
            }
            // A manifest must never stop Hub.
            try {
                ExtensionManifest.Command command = tool.command();
                ToolManager.ToolDefinition definition = toolManager.newTool(tool.name())
                        .setTitle(tool.extensionName() + ": " + tool.commandName())
                        .setDescription(command.description())
                        .setInputSchema(tool.inputSchema())
                        .setAnnotations(annotations(tool))
                        .setHandler(args -> call(tool, args.args()));
                if (command.output() != null) {
                    definition.setOutputSchema(tool.outputSchema());
                }
                definition.register();
                registered.add(tool.name());
            } catch (RuntimeException e) {
                logger.warn("Extension {} command '{}' has no MCP tool: CALM Hub cannot register it: {}",
                        tool.extensionId(), tool.commandName(), e.toString());
                remove(tool);
            }
        }
        if (!registered.isEmpty()) {
            logger.info("Registered MCP tools for extension commands: {}", registered);
        }
    }

    // ToolManager adds the tool before its ToolAdded observers run, so a tool that an observer refuses stays listed.
    // register() checked that no other tool has this name.
    private void remove(ExtensionTool tool) {
        try {
            toolManager.removeTool(tool.name());
        } catch (RuntimeException e) {
            logger.error("MCP tool {} may still be listed: CALM Hub cannot remove it: {}", tool.name(), e.toString());
        }
    }

    /**
     * The tools for the commands that this Hub can run, sorted by name. {@code tools/list} keeps the
     * registration order. A read-only Hub has already left out the commands of write routes.
     */
    static List<ExtensionTool> tools(List<ExtensionManifest> manifests) {
        List<ExtensionTool> tools = new ArrayList<>();
        for (ExtensionManifest manifest : manifests) {
            manifest.commands().forEach((name, command) -> {
                try {
                    ExtensionManifest.Route route = manifest.route(command.route())
                            .orElseThrow(() -> new IllegalStateException("it names route '" + command.route()
                                    + "', which is not declared"));
                    if (isInvalid(manifest.id(), name, "input", command.input())
                            || isInvalid(manifest.id(), name, "output", command.output())
                            || hasBadRef(manifest.id(), name, "input", command.input(), inputSchemaId(manifest.id(), name))
                            || hasBadRef(manifest.id(), name, "output", command.output(), outputSchemaId(manifest.id(), name))) {
                        return;
                    }
                    tools.add(new ExtensionTool(ExtensionManifestLoader.toolName(manifest.id(), name), manifest.id(),
                            manifest.name(), name, command, route,
                            InputSchema.of(manifest.id(), name, published(command.input()))));
                } catch (RuntimeException e) {
                    logger.warn("Extension {} command '{}' has no MCP tool: {}", manifest.id(), name, e.getMessage());
                }
            });
        }
        tools.sort(Comparator.comparing(ExtensionTool::name));
        return tools;
    }

    private static boolean isInvalid(String extensionId, String commandName, String kind, Map<String, Object> schema) {
        String error = schema == null ? null : schemaError(schema);
        if (error != null) {
            logger.warn("Extension {} command '{}' has no MCP tool: its {} schema is not valid JSON Schema 2020-12: {}",
                    extensionId, commandName, kind, error);
        }
        return error != null;
    }

    static String schemaError(Map<String, Object> schema) {
        return schemaError(schema, META_SCHEMAS);
    }

    /**
     * The error of a command schema that names the value to fix, or null. The Quarkus MCP server and
     * the SDK clients fail on a property schema that is not an object or a boolean, and Ajv in the SDK
     * fails on a pattern that is not ECMA-262. The manifest check does not check command schemas.
     */
    static String schemaError(Map<String, Object> schema, SchemaRepository metaSchemas) {
        String error = firstError(schema, "", ExtensionTools::dialectError);
        if (error != null) {
            return error;
        }
        if (metaSchemas == null) {
            return "CALM Hub cannot load the JSON Schema 2020-12 meta-schema";
        }
        OutputUnit result;
        try {
            result = metaSchemas.validator(META_SCHEMA, META_SCHEMA_OPTIONS)
                    .validate(new JsonObject(new LinkedHashMap<>(schema)).copy());
        } catch (RuntimeException e) {
            return "CALM Hub cannot check it: " + e;
        }
        if (!Boolean.TRUE.equals(result.getValid())) {
            // The deepest error names the value to fix. The others say only that a parent does not match.
            OutputUnit deepest = result.getErrors() == null ? result : result.getErrors().stream()
                    .max(Comparator.comparingInt(unit -> location(unit).length()))
                    .orElse(result);
            return at(location(deepest)) + ": " + deepest.getError();
        }
        return firstError(schema, "", ExtensionTools::patternError);
    }

    private static String location(OutputUnit error) {
        return error.getInstanceLocation() == null ? "" : error.getInstanceLocation().replaceFirst("^#", "");
    }

    private static String at(String pointer) {
        return pointer.isEmpty() ? "/" : pointer;
    }

    // Hub checks input as 2020-12 and MCP clients assume it, so another dialect would change the meaning.
    private static String dialectError(Map<String, Object> schema, String pointer) {
        Object dialect = schema.get("$schema");
        if (dialect == null || META_SCHEMA.equals(dialect) || (META_SCHEMA + "#").equals(dialect)) {
            return null;
        }
        return at(pointer) + ": it declares the $schema '" + dialect + "', but CALM Hub supports only JSON Schema 2020-12 ("
                + META_SCHEMA + ")";
    }

    // java.util.regex, which the meta-schema check uses for format regex, accepts syntax that Ajv in the SDK refuses.
    private static String patternError(Map<String, Object> schema, String pointer) {
        if (schema.get("pattern") instanceof String pattern) {
            String error = EcmaRegex.error(pattern);
            if (error != null) {
                return pointer + "/pattern: '" + pattern + "' is not an ECMA-262 regular expression: " + error;
            }
        }
        if (schema.get("patternProperties") instanceof Map<?, ?> patterns) {
            for (Object key : patterns.keySet()) {
                String error = EcmaRegex.error(String.valueOf(key));
                if (error != null) {
                    return pointer + "/patternProperties: the key '" + key + "' is not an ECMA-262 regular expression: "
                            + error;
                }
            }
        }
        return null;
    }

    /**
     * The first error of {@code check} on a schema and its subschemas, or the location of a subschema
     * that is not an object or a boolean.
     */
    @SuppressWarnings("unchecked")
    private static String firstError(Object value, String pointer, BiFunction<Map<String, Object>, String, String> check) {
        if (value instanceof Boolean) {
            return null;
        }
        if (!(value instanceof Map<?, ?> map)) {
            return at(pointer) + ": the value must be a schema (an object or a boolean)";
        }
        String own = check.apply((Map<String, Object>) map, pointer);
        if (own != null) {
            return own;
        }
        for (Map.Entry<String, Object> entry : ((Map<String, Object>) map).entrySet()) {
            String keyword = entry.getKey();
            String here = pointer + "/" + escape(keyword);
            String error = null;
            // A dependencies value can also be a list of names.
            if (SCHEMA_MAPS.contains(keyword) && entry.getValue() instanceof Map<?, ?> named) {
                for (Map.Entry<?, ?> subschema : named.entrySet()) {
                    if (error == null && !(keyword.equals("dependencies") && subschema.getValue() instanceof List)) {
                        error = firstError(subschema.getValue(), here + "/" + escape(String.valueOf(subschema.getKey())), check);
                    }
                }
            } else if (SCHEMA_KEYWORDS.contains(keyword) && entry.getValue() instanceof List<?> list) {
                for (int i = 0; i < list.size() && error == null; i++) {
                    error = firstError(list.get(i), here + "/" + i, check);
                }
            } else if (SCHEMA_KEYWORDS.contains(keyword)) {
                error = firstError(entry.getValue(), here, check);
            }
            if (error != null) {
                return error;
            }
        }
        return null;
    }

    private static String escape(String token) {
        return token.replace("~", "~0").replace("/", "~1");
    }

    // Null if the meta-schemas that vertx-json-schema bundles cannot be loaded. Hub then starts with no extension tools.
    static SchemaRepository metaSchemas(String path) {
        try {
            SchemaRepository repository = SchemaRepository.create(META_SCHEMA_OPTIONS);
            ClassLoader loader = ExtensionTools.class.getClassLoader();
            for (String file : META_SCHEMA_FILES) {
                try (InputStream in = loader.getResourceAsStream(path + file)) {
                    if (in == null) {
                        throw new IOException("there is no resource " + path + file);
                    }
                    repository.dereference(META_SCHEMA_BASE + file,
                            JsonSchema.of(new JsonObject(new String(in.readAllBytes(), StandardCharsets.UTF_8))));
                }
            }
            return repository;
        } catch (IOException | RuntimeException e) {
            logger.error("CALM Hub cannot load the JSON Schema 2020-12 meta-schema: {}", e.toString());
            return null;
        }
    }

    private static boolean hasBadRef(String extensionId, String commandName, String kind,
                                     Map<String, Object> schema, String defaultId) {
        if (schema == null) {
            return false;
        }
        String ref = remoteRef(schema, defaultId);
        if (ref != null) {
            logger.warn("Extension {} command '{}' has no MCP tool: its {} schema has the $ref '{}', which is remote or "
                    + "not a valid URI. CALM Hub and MCP clients do not fetch remote schemas", extensionId, commandName, kind, ref);
            return true;
        }
        ref = unresolvedRef(schema, defaultId);
        if (ref != null) {
            logger.warn("Extension {} command '{}' has no MCP tool: its {} schema has the $ref '{}', which points to "
                    + "nothing in the schema, or only to a loop of $refs", extensionId, commandName, kind, ref);
            return true;
        }
        return false;
    }

    static ToolManager.ToolAnnotations annotations(ExtensionTool tool) {
        boolean readOnly = tool.readOnly();
        ExtensionManifest.Command command = tool.command();
        // With no hint in the manifest, use the MCP defaults: a write may be destructive and is not idempotent.
        boolean destructive = !readOnly && (command.destructive() == null || command.destructive());
        boolean idempotent = readOnly || Boolean.TRUE.equals(command.idempotent());
        return new ToolManager.ToolAnnotations(null, readOnly, destructive, idempotent, true);
    }

    ToolResponse call(ExtensionTool tool, Map<String, Object> args) {
        Optional<ToolResponse> err = McpValidationHelper.firstError(
                () -> McpValidationHelper.checkEnabled(mcpEnabled));
        if (err.isPresent()) return err.get();

        JsonObject input = new JsonObject(args == null ? new LinkedHashMap<>() : new LinkedHashMap<>(args)).copy();
        String inputError = validate(tool, input);
        if (inputError != null) {
            return ToolResponse.error(inputError);
        }
        ExtensionProxyRequest request;
        try {
            request = request(tool, input);
        } catch (IllegalArgumentException e) {
            return ToolResponse.error("Error: " + e.getMessage());
        }
        try {
            return response(tool, proxyService.call(identity, request));
        } catch (ExtensionProxyException e) {
            return ToolResponse.error("Error: " + e.getMessage());
        }
    }

    private static String validate(ExtensionTool tool, JsonObject input) {
        OutputUnit result;
        try {
            result = tool.inputValidator().validate(input);
        } catch (RuntimeException e) {
            // vertx-json-schema throws on some valid schemas, such as a pattern with \p{..}.
            logger.warn("Cannot check the input of MCP tool {}: {}", tool.name(), e.toString());
            return "Error: CALM Hub cannot check the input against the schema of this command.";
        }
        if (Boolean.TRUE.equals(result.getValid())) {
            return null;
        }
        List<OutputUnit> errors = result.getErrors() == null || result.getErrors().isEmpty() ? List.of(result) : result.getErrors();
        StringBuilder sb = new StringBuilder("Error: The input does not match the schema of this command:");
        for (OutputUnit error : errors) {
            String location = error.getInstanceLocation() == null ? "" : error.getInstanceLocation().replaceFirst("^#", "");
            sb.append("\n- ").append(location.isEmpty() ? "/" : location).append(": ").append(error.getError());
        }
        return sb.toString();
    }

    /**
     * The ADR 0012 mapping, as the CLI does it: input properties that match a {@code {param}} fill
     * the path. The rest go to the query for GET and DELETE, and to the JSON body for other methods.
     */
    static ExtensionProxyRequest request(ExtensionTool tool, JsonObject input) {
        ExtensionManifest.Route route = tool.route();
        Map<String, Object> rest = new LinkedHashMap<>(input.getMap());
        Matcher matcher = PATH_PARAM.matcher(route.path());
        StringBuilder path = new StringBuilder();
        while (matcher.find()) {
            String name = matcher.group(1);
            Object value = input.getValue(name);
            if (!(value instanceof String || value instanceof Number || value instanceof Boolean)) {
                throw new IllegalArgumentException("Input property '" + name + "' must be a string, number or boolean, "
                        + "because it fills the path " + route.path());
            }
            String text = String.valueOf(value);
            if (text.equals(".") || text.equals("..")) {
                throw new IllegalArgumentException("Input property '" + name + "' must not be . or .., because it fills "
                        + "the path " + route.path());
            }
            rest.remove(name);
            matcher.appendReplacement(path, Matcher.quoteReplacement(encode(text)));
        }
        matcher.appendTail(path);

        String method = route.method();
        if ("GET".equals(method) || "DELETE".equals(method)) {
            List<String> query = new ArrayList<>();
            rest.forEach((name, value) -> queryValues(value).forEach(v -> query.add(encode(name) + "=" + encode(v))));
            return new ExtensionProxyRequest(tool.extensionId(), method, path.toString(),
                    query.isEmpty() ? null : String.join("&", query), null, null, null, null);
        }
        byte[] body = new JsonObject(rest).encode().getBytes(StandardCharsets.UTF_8);
        return new ExtensionProxyRequest(tool.extensionId(), method, path.toString(), null, "application/json", null,
                null, new ByteArrayInputStream(body));
    }

    /**
     * A 2xx reply is the tool result. A command with an object output schema must reply with a JSON
     * object. Any other output schema is wrapped, so the reply can be any JSON value.
     */
    static ToolResponse response(ExtensionTool tool, ExtensionProxyResponse reply) {
        String body = new String(reply.body(), StandardCharsets.UTF_8);
        if (reply.status() >= 300) {
            return ToolResponse.error("Error: The extension replied with status " + reply.status()
                    + (body.isBlank() ? "." : ": " + body));
        }
        if (tool.command().output() == null) {
            return ToolResponse.success(body);
        }
        if (tool.wrapsOutput()) {
            try {
                Object value = Json.decodeValue(body);
                Map<String, Object> structured = new LinkedHashMap<>();
                structured.put(RESULT, value instanceof JsonObject object ? object.getMap()
                        : value instanceof JsonArray array ? array.getList() : value);
                return new ToolResponse(false, List.of(new TextContent(Json.encode(structured))), structured, null);
            } catch (DecodeException e) {
                logger.warn("Extension {} command {} replied with no JSON, but declares an output schema",
                        tool.extensionId(), tool.commandName());
                return ToolResponse.error("Error: The extension reply is not the JSON that this command declares.");
            }
        }
        try {
            // Clients that do not read structuredContent get the same JSON as text.
            return new ToolResponse(false, List.of(new TextContent(body)), new JsonObject(body).getMap(), null);
        } catch (DecodeException | ClassCastException e) {
            logger.warn("Extension {} command {} replied with no JSON object, but declares an output schema",
                    tool.extensionId(), tool.commandName());
            return ToolResponse.error("Error: The extension reply is not the JSON object that this command declares.");
        }
    }

    private static List<String> queryValues(Object value) {
        if (value instanceof JsonArray array) {
            return array.stream().flatMap(item -> queryValues(item).stream()).toList();
        }
        if (value instanceof List<?> list) {
            return list.stream().flatMap(item -> queryValues(item).stream()).toList();
        }
        if (value instanceof String || value instanceof Number || value instanceof Boolean) {
            return List.of(String.valueOf(value));
        }
        // An object or null is sent as JSON.
        return List.of(Json.encode(value));
    }

    /** Percent-encodes all but the RFC 3986 unreserved characters, so a value cannot add a path segment. */
    static String encode(String value) {
        StringBuilder sb = new StringBuilder();
        for (byte b : value.getBytes(StandardCharsets.UTF_8)) {
            int c = b & 0xff;
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')
                    || c == '-' || c == '.' || c == '_' || c == '~') {
                sb.append((char) c);
            } else {
                sb.append('%').append(Character.toUpperCase(Character.forDigit(c >> 4, 16)))
                        .append(Character.toUpperCase(Character.forDigit(c & 0xf, 16)));
            }
        }
        return sb.toString();
    }

    static String inputSchemaId(String extensionId, String commandName) {
        return SCHEMA_BASE + extensionId + "/commands/" + commandName + "/input.json";
    }

    static String outputSchemaId(String extensionId, String commandName) {
        return SCHEMA_BASE + extensionId + "/commands/" + commandName + "/output.json";
    }

    /**
     * The first {@code $ref} or {@code $dynamicRef} that points outside the schema, or null. Hub does
     * not fetch remote schemas, so a tool with one in its input fails on every call. The SDK clients
     * fail to list the tools if an output schema has one.
     */
    static String remoteRef(Map<String, Object> schema, String defaultId) {
        Refs refs = Refs.of(schema, defaultId);
        for (Map.Entry<URI, String> ref : refs.refs()) {
            URI target = resolve(ref.getValue(), ref.getKey());
            if (target == null || !refs.resources().containsKey(withoutFragment(target))) {
                return ref.getValue();
            }
        }
        return null;
    }

    /**
     * The first local {@code $ref} or {@code $dynamicRef} that points to no subschema, or to a loop of
     * {@code $ref}s, or null. The SDK clients fail to list the tools if an output schema has one (Ajv
     * overflows its stack on a loop), and a tool with one in its input fails on every call. Call it
     * after {@link #remoteRef}.
     */
    static String unresolvedRef(Map<String, Object> schema, String defaultId) {
        Refs refs = Refs.of(schema, defaultId);
        for (Map.Entry<URI, String> ref : refs.refs()) {
            Set<Object> seen = Collections.newSetFromMap(new IdentityHashMap<>());
            URI base = ref.getKey();
            String value = ref.getValue();
            while (true) {
                URI target = resolve(value, base);
                Object node = target == null ? null : refs.target(target);
                if (node == null) {
                    return ref.getValue();
                }
                if (!(node instanceof Map<?, ?> map) || !(map.get("$ref") instanceof String next)) {
                    break;
                }
                if (!seen.add(node)) {
                    return ref.getValue();
                }
                base = refs.bases().getOrDefault(node, withoutFragment(target));
                value = next;
            }
        }
        return null;
    }

    /** The refs of a schema with their base URIs, and the schema resources, anchors and subschemas that they can point to. */
    private record Refs(List<Map.Entry<URI, String>> refs, Map<URI, Map<String, Object>> resources,
                        Map<URI, Map<String, Object>> anchors, Map<Object, URI> bases) {

        static Refs of(Map<String, Object> schema, String defaultId) {
            URI fallback = URI.create(defaultId);
            URI base = schema.get("$id") instanceof String id ? Optional.ofNullable(resolve(id, fallback)).orElse(fallback) : fallback;
            Refs refs = new Refs(new ArrayList<>(), new LinkedHashMap<>(), new LinkedHashMap<>(), new IdentityHashMap<>());
            refs.collect(schema, base, true);
            return refs;
        }

        private void collect(Map<String, Object> schema, URI base, boolean root) {
            URI here = base;
            if (schema.get("$id") instanceof String id) {
                URI resolved = resolve(id, base);
                if (resolved != null) {
                    here = resolved;
                }
            }
            URI resource = withoutFragment(here);
            bases.put(schema, here);
            if (root || schema.containsKey("$id")) {
                resources.putIfAbsent(resource, schema);
            }
            for (String keyword : List.of("$anchor", "$dynamicAnchor")) {
                if (schema.get(keyword) instanceof String anchor) {
                    anchors.computeIfAbsent(resource, k -> new LinkedHashMap<>()).putIfAbsent(anchor, schema);
                }
            }
            for (String keyword : List.of("$ref", "$dynamicRef")) {
                if (schema.get(keyword) instanceof String ref) {
                    refs.add(Map.entry(here, ref));
                }
            }
            URI scope = here;
            mapSubschemas(schema, subschema -> {
                collect(subschema, scope, false);
                return subschema;
            });
        }

        // The subschema, or null. A fragment is a JSON Pointer from the resource root, or the name of an anchor in it.
        Object target(URI target) {
            Map<String, Object> resource = resources.get(withoutFragment(target));
            String fragment = target.getFragment();
            if (resource == null || fragment == null || fragment.isEmpty()) {
                return resource;
            }
            if (!fragment.startsWith("/")) {
                return anchors.getOrDefault(withoutFragment(target), Map.of()).get(fragment);
            }
            Object value = resource;
            for (String token : fragment.substring(1).split("/", -1)) {
                String key = token.replace("~1", "/").replace("~0", "~");
                if (value instanceof Map<?, ?> map && map.containsKey(key)) {
                    value = map.get(key);
                } else if (value instanceof List<?> list && key.matches("0|[1-9][0-9]{0,8}") && Integer.parseInt(key) < list.size()) {
                    value = list.get(Integer.parseInt(key));
                } else {
                    return null;
                }
            }
            return value instanceof Map || value instanceof Boolean ? value : null;
        }
    }

    /**
     * The schema that Hub publishes, with the same meaning. Boolean subschemas become objects: the
     * Quarkus MCP server and the SDK clients require an object for each property. Ajv, which the MCP
     * TypeScript SDK uses to compile output schemas, overflows its stack on a subschema with both
     * {@code $id} and {@code $ref}. The same ref in {@code allOf} compiles.
     */
    static Map<String, Object> published(Map<String, Object> schema) {
        Map<String, Object> copy = mapSubschemas(schema, ExtensionTools::published);
        if (!copy.containsKey("$id")) {
            return copy;
        }
        List<Object> allOf = new ArrayList<>();
        if (copy.get("allOf") instanceof List<?> existing) {
            allOf.addAll(existing);
        }
        int size = allOf.size();
        for (String keyword : List.of("$ref", "$dynamicRef")) {
            if (copy.get(keyword) != null) {
                allOf.add(Map.of(keyword, copy.remove(keyword)));
            }
        }
        if (allOf.size() > size) {
            copy.put("allOf", allOf);
        }
        return copy;
    }

    /**
     * A copy of a schema with {@code f} applied to each direct subschema, a boolean one in its object
     * form, except for {@link #BOOLEAN_KEYWORDS}. The values of other keywords, also unknown ones, are
     * data and stay as they are.
     */
    private static Map<String, Object> mapSubschemas(Map<String, Object> schema, UnaryOperator<Map<String, Object>> f) {
        Map<String, Object> copy = new LinkedHashMap<>();
        schema.forEach((keyword, value) -> {
            if (SCHEMA_MAPS.contains(keyword) && value instanceof Map<?, ?> named) {
                Map<String, Object> mapped = new LinkedHashMap<>();
                named.forEach((name, subschema) -> mapped.put(String.valueOf(name), mapSubschema(subschema, f)));
                copy.put(keyword, mapped);
            } else if (SCHEMA_KEYWORDS.contains(keyword) && !(value instanceof Boolean && BOOLEAN_KEYWORDS.contains(keyword))) {
                copy.put(keyword, value instanceof List<?> list
                        ? list.stream().map(item -> mapSubschema(item, f)).toList()
                        : mapSubschema(value, f));
            } else {
                copy.put(keyword, value);
            }
        });
        return copy;
    }

    // A boolean schema and its object form have the same meaning.
    @SuppressWarnings("unchecked")
    private static Object mapSubschema(Object value, UnaryOperator<Map<String, Object>> f) {
        if (value instanceof Boolean accept) {
            return f.apply(accept ? Map.of() : Map.of("not", Map.of()));
        }
        if (value instanceof Map<?, ?> map) {
            return f.apply((Map<String, Object>) map);
        }
        return value;
    }

    /**
     * {@link URI#resolve} returns a ref unchanged against an opaque base such as {@code urn:} or
     * {@code tag:}, and drops the last path segment for an empty ref. A ref that is only a fragment
     * points into the base document, whatever its scheme.
     */
    private static URI resolve(String value, URI base) {
        try {
            URI ref = new URI(value);
            if (ref.getScheme() == null && ref.getRawSchemeSpecificPart().isEmpty()) {
                return new URI(base.getScheme(), base.getSchemeSpecificPart(), ref.getFragment());
            }
            if (ref.isAbsolute() || !base.isOpaque()) {
                return base.resolve(ref);
            }
            return null;
        } catch (URISyntaxException | IllegalArgumentException e) {
            return null;
        }
    }

    private static URI withoutFragment(URI uri) {
        try {
            return new URI(uri.getScheme(), uri.getSchemeSpecificPart(), null);
        } catch (URISyntaxException e) {
            return uri;
        }
    }

    /**
     * MCP servers do not check arguments against the input schema, so Hub does. Local {@code $ref}s
     * resolve only once the schema is in a repository.
     */
    record InputSchema(SchemaRepository repository, String id, JsonSchemaOptions options) {

        static InputSchema of(String extensionId, String commandName, Map<String, Object> input) {
            try {
                JsonObject schema = new JsonObject(new LinkedHashMap<>(input)).copy();
                String id = schema.getString("$id", inputSchemaId(extensionId, commandName));
                JsonSchemaOptions options = new JsonSchemaOptions()
                        .setDraft(Draft.DRAFT202012)
                        .setBaseUri(id)
                        .setOutputFormat(OutputFormat.Basic);
                SchemaRepository repository = SchemaRepository.create(options);
                repository.dereference(id, JsonSchema.of(schema));
                return new InputSchema(repository, id, options);
            } catch (RuntimeException e) {
                throw new IllegalStateException("CALM Hub cannot read its input schema: " + e.getMessage(), e);
            }
        }

        OutputUnit validate(JsonObject instance) {
            return repository.validator(id, options).validate(instance);
        }
    }
}
