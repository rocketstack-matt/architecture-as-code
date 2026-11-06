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
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

    // After ExtensionRegistry has loaded the manifests on the same event.
    void onStartup(@Observes @Priority(Interceptor.Priority.APPLICATION + 1000) StartupEvent event) {
        register();
    }

    void register() {
        if (!mcpEnabled) {
            return;
        }
        List<String> registered = new ArrayList<>();
        for (ExtensionTool tool : tools(registry.available())) {
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
            }
        }
        if (!registered.isEmpty()) {
            logger.info("Registered MCP tools for extension commands: {}", registered);
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
                    if (hasRemoteRef(manifest.id(), name, "input", command.input(), inputSchemaId(manifest.id(), name))
                            || hasRemoteRef(manifest.id(), name, "output", command.output(), outputSchemaId(manifest.id(), name))) {
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

    private static boolean hasRemoteRef(String extensionId, String commandName, String kind,
                                        Map<String, Object> schema, String defaultId) {
        String ref = schema == null ? null : remoteRef(schema, defaultId);
        if (ref != null) {
            logger.warn("Extension {} command '{}' has no MCP tool: its {} schema has the $ref '{}', which is remote or "
                    + "not a valid URI. CALM Hub and MCP clients do not fetch remote schemas", extensionId, commandName, kind, ref);
        }
        return ref != null;
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
        URI fallback = URI.create(defaultId);
        URI base = schema.get("$id") instanceof String id ? Optional.ofNullable(resolve(id, fallback)).orElse(fallback) : fallback;
        Set<URI> ids = new HashSet<>();
        List<Map.Entry<URI, String>> refs = new ArrayList<>();
        collectRefs(schema, base, ids, refs);
        for (Map.Entry<URI, String> ref : refs) {
            URI target = resolve(ref.getValue(), ref.getKey());
            if (target == null || !ids.contains(withoutFragment(target))) {
                return ref.getValue();
            }
        }
        return null;
    }

    private static void collectRefs(Map<String, Object> schema, URI base, Set<URI> ids, List<Map.Entry<URI, String>> refs) {
        URI here = base;
        if (schema.get("$id") instanceof String id) {
            URI resolved = resolve(id, base);
            if (resolved != null) {
                here = resolved;
            }
        }
        ids.add(withoutFragment(here));
        for (String keyword : List.of("$ref", "$dynamicRef")) {
            if (schema.get(keyword) instanceof String ref) {
                refs.add(Map.entry(here, ref));
            }
        }
        URI scope = here;
        mapSubschemas(schema, subschema -> {
            collectRefs(subschema, scope, ids, refs);
            return subschema;
        });
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
                throw new IllegalStateException("Extension " + extensionId + " command '" + commandName
                        + "' has an input schema that CALM Hub cannot read: " + e.getMessage(), e);
            }
        }

        OutputUnit validate(JsonObject instance) {
            return repository.validator(id, options).validate(instance);
        }
    }
}
