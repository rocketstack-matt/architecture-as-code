package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.Tool;
import io.quarkiverse.mcp.server.Tool.OutputSchema;
import io.quarkiverse.mcp.server.ToolArg;
import io.quarkiverse.mcp.server.ToolResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.finos.calm.domain.Flow;
import org.finos.calm.domain.exception.FlowNotFoundException;
import org.finos.calm.domain.exception.FlowVersionNotFoundException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.domain.flow.NamespaceFlowSummary;
import org.finos.calm.mcp.results.McpResults;
import org.finos.calm.mcp.results.McpResults.FlowContentResult;
import org.finos.calm.mcp.results.McpResults.FlowListResult;
import org.finos.calm.mcp.results.McpResults.FlowSummary;
import org.finos.calm.store.FlowStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * MCP tool provider for flow resources. Exposes read operations on flows
 * within CalmHub namespaces via the Quarkiverse MCP server.
 *
 * <p>All success responses use structured content; clients should read
 * {@link ToolResponse#structuredContent()} rather than the text body.</p>
 */
@ApplicationScoped
public class FlowTools {

    private static final Logger logger = LoggerFactory.getLogger(FlowTools.class);

    @Inject
    @ConfigProperty(name = "calm.mcp.enabled", defaultValue = "true")
    boolean mcpEnabled;

    @Inject
    FlowStore flowStore;

    @Tool(
            description = "List all flows in a CalmHub namespace.",
            outputSchema = @OutputSchema(from = FlowListResult.class))
    public ToolResponse listFlows(
            @ToolArg(description = "The namespace to list flows from") String namespace) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) return ToolResponse.error(error);
        error = McpValidationHelper.validateNamespace(namespace);
        if (error != null) return ToolResponse.error(error);

        try {
            List<NamespaceFlowSummary> flows = flowStore.getFlowsForNamespace(namespace);
            List<FlowSummary> summaries = flows.stream()
                    .map(f -> new FlowSummary(
                            f.getId() == null ? 0 : f.getId(),
                            f.getName(),
                            f.getDescription()))
                    .toList();
            return ToolResponse.structuredSuccess(new FlowListResult(namespace, summaries));
        } catch (NamespaceNotFoundException e) {
            logger.warn("Namespace not found [{}]", namespace, e);
            return ToolResponse.error("Error: Namespace '" + namespace + "' not found.");
        }
    }

    @Tool(
            description = "Get the full JSON content of a specific flow version.",
            outputSchema = @OutputSchema(from = FlowContentResult.class))
    public ToolResponse getFlow(
            @ToolArg(description = "The namespace containing the flow") String namespace,
            @ToolArg(description = "The flow ID (positive integer)") int flowId,
            @ToolArg(description = "The version string (e.g. '1.0.0')") String version) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) return ToolResponse.error(error);
        error = McpValidationHelper.validateNamespace(namespace);
        if (error != null) return ToolResponse.error(error);
        error = McpValidationHelper.validatePositiveId(flowId, "Flow ID");
        if (error != null) return ToolResponse.error(error);
        error = McpValidationHelper.validateVersion(version);
        if (error != null) return ToolResponse.error(error);

        try {
            Flow flow = new Flow.FlowBuilder()
                    .setNamespace(namespace)
                    .setId(flowId)
                    .setVersion(version)
                    .build();
            String json = flowStore.getFlowForVersion(flow);
            return ToolResponse.structuredSuccess(
                    new FlowContentResult(namespace, flowId, version, McpResults.parseJson(json)));
        } catch (NamespaceNotFoundException e) {
            logger.warn("Namespace not found [{}]", namespace, e);
            return ToolResponse.error("Error: Namespace '" + namespace + "' not found.");
        } catch (FlowNotFoundException e) {
            logger.warn("Flow [{}] not found in namespace [{}]", flowId, namespace, e);
            return ToolResponse.error("Error: Flow " + flowId + " not found in namespace '" + namespace + "'.");
        } catch (FlowVersionNotFoundException e) {
            logger.warn("Version [{}] not found for flow [{}] in namespace [{}]", version, flowId, namespace, e);
            return ToolResponse.error("Error: Version '" + version + "' not found for flow " + flowId + ".");
        }
    }
}
