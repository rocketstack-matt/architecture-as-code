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
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    private static final String INPUT_SCHEMA_BASE = "https://calm.finos.org/calm-hub/extensions/";

    /** One command with what its handler needs. */
    record ExtensionTool(String name, String extensionId, String extensionName, String commandName,
                         ExtensionManifest.Command command, ExtensionManifest.Route route, InputSchema inputSchema) {

        boolean readOnly() {
            return "GET".equals(route.method()) || route.readOnly();
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
        List<ExtensionTool> tools = tools(registry.available());
        for (ExtensionTool tool : tools) {
            ExtensionManifest.Command command = tool.command();
            ToolManager.ToolDefinition definition = toolManager.newTool(tool.name())
                    .setTitle(tool.extensionName() + ": " + tool.commandName())
                    .setDescription(command.description())
                    .setInputSchema(command.input())
                    .setAnnotations(annotations(tool))
                    .setHandler(args -> call(tool, args.args()));
            if (command.output() != null) {
                definition.setOutputSchema(command.output());
            }
            definition.register();
        }
        if (!tools.isEmpty()) {
            logger.info("Registered MCP tools for extension commands: {}", tools.stream().map(ExtensionTool::name).toList());
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
                ExtensionManifest.Route route = manifest.route(command.route())
                        .orElseThrow(() -> new IllegalStateException("Extension " + manifest.id() + " command '"
                                + name + "' names route '" + command.route() + "', which is not declared"));
                tools.add(new ExtensionTool(ExtensionManifestLoader.toolName(manifest.id(), name), manifest.id(),
                        manifest.name(), name, command, route, InputSchema.of(manifest.id(), name, command.input())));
            });
        }
        tools.sort(Comparator.comparing(ExtensionTool::name));
        return tools;
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
            result = tool.inputSchema().validate(input);
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

    /** A 2xx reply is the tool result. A command with an output schema must reply with a JSON object. */
    static ToolResponse response(ExtensionTool tool, ExtensionProxyResponse reply) {
        String body = new String(reply.body(), StandardCharsets.UTF_8);
        if (reply.status() >= 300) {
            return ToolResponse.error("Error: The extension replied with status " + reply.status()
                    + (body.isBlank() ? "." : ": " + body));
        }
        if (tool.command().output() == null) {
            return ToolResponse.success(body);
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

    /**
     * MCP servers do not check arguments against the input schema, so Hub does. Local {@code $ref}s
     * resolve only once the schema is in a repository. A schema that cannot be read stops Hub.
     */
    record InputSchema(SchemaRepository repository, String id, JsonSchemaOptions options) {

        static InputSchema of(String extensionId, String commandName, Map<String, Object> input) {
            try {
                JsonObject schema = new JsonObject(new LinkedHashMap<>(input)).copy();
                String id = schema.getString("$id", INPUT_SCHEMA_BASE + extensionId + "/commands/" + commandName + "/input.json");
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
