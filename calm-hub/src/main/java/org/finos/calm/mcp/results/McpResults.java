package org.finos.calm.mcp.results;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

/**
 * Container for the structured-content result types returned by CalmHub MCP tools.
 *
 * <p>Each tool method declares its output schema via
 * {@code @Tool(outputSchema = @OutputSchema(from = ...class))} and returns one of
 * the records defined here via {@code ToolResponse.structuredSuccess(...)}.</p>
 *
 * <p>Records are grouped here (rather than spread across many files) because
 * they are simple value carriers used only by the MCP layer.</p>
 */
public final class McpResults {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private McpResults() {
    }

    /**
     * Parse a raw JSON string from a CalmHub store into a {@link JsonNode} so it
     * can be embedded in a structured-content response without double-encoding.
     * If the input cannot be parsed it is returned as a JSON text node so the
     * structured payload remains well-formed.
     */
    public static JsonNode parseJson(String json) {
        if (json == null) {
            return null;
        }
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            return MAPPER.getNodeFactory().textNode(json);
        }
    }

    // --- Architecture ---

    public record ArchitectureSummary(int id, String name, String description) {
    }

    public record ArchitectureListResult(String namespace, List<ArchitectureSummary> architectures) {
    }

    public record ArchitectureVersionListResult(String namespace, int id, List<String> versions) {
    }

    public record ArchitectureContentResult(String namespace, int id, String version, JsonNode content) {
    }

    public record CreateArchitectureResult(String namespace, int id, String version, String message) {
    }

    // --- Control ---

    public record ControlSummary(int id, String name, String description) {
    }

    public record ControlListResult(String domain, List<ControlSummary> controls) {
    }

    public record ControlContentResult(String domain, int id, String version, JsonNode content) {
    }

    public record ControlVersionListResult(String domain, int id, List<String> versions) {
    }

    // --- Decorator ---

    public record DecoratorSummary(String uniqueId, String type, List<String> target) {
    }

    public record DecoratorView(String uniqueId,
                                String type,
                                List<String> target,
                                List<String> targetType,
                                List<String> appliesTo,
                                Object data) {
    }

    public record DecoratorListResult(String namespace, List<DecoratorSummary> decorators) {
    }

    public record DecoratorDetailResult(String namespace, int id, DecoratorView decorator) {
    }

    public record CreateDecoratorResult(String namespace, int id, String message) {
    }

    public record UpdateDecoratorResult(String namespace,
                                        int id,
                                        DecoratorView decorator,
                                        String message) {
    }

    // --- Flow ---

    public record FlowSummary(int id, String name, String description) {
    }

    public record FlowListResult(String namespace, List<FlowSummary> flows) {
    }

    public record FlowContentResult(String namespace, int id, String version, JsonNode content) {
    }

    // --- Namespace / Domain ---

    public record NamespaceView(String name, String description) {
    }

    public record NamespaceListResult(List<NamespaceView> namespaces) {
    }

    public record CreateNamespaceResult(String name, String message) {
    }

    public record DomainListResult(List<String> domains) {
    }

    // --- Search ---

    public record SearchHit(String namespace, int id, String name, String description) {
    }

    public record SearchGroup(String type, int total, int shown, List<SearchHit> items) {
    }

    public record SearchResultEnvelope(String query, List<SearchGroup> groups) {
    }
}
