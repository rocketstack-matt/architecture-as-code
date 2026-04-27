package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.Tool;
import io.quarkiverse.mcp.server.Tool.OutputSchema;
import io.quarkiverse.mcp.server.ToolArg;
import io.quarkiverse.mcp.server.ToolResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.finos.calm.domain.controls.ControlDetail;
import org.finos.calm.domain.exception.ControlNotFoundException;
import org.finos.calm.domain.exception.ControlRequirementVersionNotFoundException;
import org.finos.calm.domain.exception.DomainNotFoundException;
import org.finos.calm.mcp.results.McpResults;
import org.finos.calm.mcp.results.McpResults.ControlContentResult;
import org.finos.calm.mcp.results.McpResults.ControlListResult;
import org.finos.calm.mcp.results.McpResults.ControlSummary;
import org.finos.calm.mcp.results.McpResults.ControlVersionListResult;
import org.finos.calm.store.ControlStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * MCP tool provider for control requirement resources. Exposes read operations
 * on control requirements within CalmHub domains via the Quarkiverse MCP server.
 *
 * <p>All success responses use structured content; clients should read
 * {@link ToolResponse#structuredContent()} rather than the text body.</p>
 */
@ApplicationScoped
public class ControlTools {

    private static final Logger logger = LoggerFactory.getLogger(ControlTools.class);

    @Inject
    @ConfigProperty(name = "calm.mcp.enabled", defaultValue = "true")
    boolean mcpEnabled;

    @Inject
    ControlStore controlStore;

    @Tool(
            description = "List all control requirements in a domain (e.g. 'security'). Returns control IDs, names, and descriptions.",
            outputSchema = @OutputSchema(from = ControlListResult.class))
    public ToolResponse listControls(
            @ToolArg(description = "The domain to list controls for (e.g. 'security')") String domain) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateDomain(domain);
        if (error != null) {
            return ToolResponse.error(error);
        }

        try {
            List<ControlDetail> controls = controlStore.getControlsForDomain(domain);
            List<ControlSummary> summaries = controls.stream()
                    .map(c -> new ControlSummary(
                            c.getId() == null ? 0 : c.getId(),
                            c.getName(),
                            c.getDescription()))
                    .toList();
            return ToolResponse.structuredSuccess(new ControlListResult(domain, summaries));
        } catch (DomainNotFoundException e) {
            logger.warn("Domain not found [{}]", domain, e);
            return ToolResponse.error("Error: Domain '" + domain + "' not found.");
        }
    }

    @Tool(
            description = "Get the full JSON content of a specific control requirement version.",
            outputSchema = @OutputSchema(from = ControlContentResult.class))
    public ToolResponse getControl(
            @ToolArg(description = "The domain containing the control (e.g. 'security')") String domain,
            @ToolArg(description = "The control ID (positive integer)") int controlId,
            @ToolArg(description = "The version string (e.g. '1.0.0')") String version) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateDomain(domain);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validatePositiveId(controlId, "Control ID");
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateVersion(version);
        if (error != null) {
            return ToolResponse.error(error);
        }

        try {
            String json = controlStore.getRequirementForVersion(domain, controlId, version);
            return ToolResponse.structuredSuccess(
                    new ControlContentResult(domain, controlId, version, McpResults.parseJson(json)));
        } catch (DomainNotFoundException e) {
            logger.warn("Domain not found [{}]", domain, e);
            return ToolResponse.error("Error: Domain '" + domain + "' not found.");
        } catch (ControlNotFoundException e) {
            logger.warn("Control [{}] not found in domain [{}]", controlId, domain, e);
            return ToolResponse.error("Error: Control " + controlId + " not found in domain '" + domain + "'.");
        } catch (ControlRequirementVersionNotFoundException e) {
            logger.warn("Version [{}] not found for control [{}] in domain [{}]", version, controlId, domain, e);
            return ToolResponse.error("Error: Version '" + version + "' not found for control " + controlId + ".");
        }
    }

    @Tool(
            description = "List available versions for a specific control requirement.",
            outputSchema = @OutputSchema(from = ControlVersionListResult.class))
    public ToolResponse listControlVersions(
            @ToolArg(description = "The domain containing the control (e.g. 'security')") String domain,
            @ToolArg(description = "The control ID (positive integer)") int controlId) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateDomain(domain);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validatePositiveId(controlId, "Control ID");
        if (error != null) {
            return ToolResponse.error(error);
        }

        try {
            List<String> versions = controlStore.getRequirementVersions(domain, controlId);
            return ToolResponse.structuredSuccess(
                    new ControlVersionListResult(domain, controlId, versions));
        } catch (DomainNotFoundException e) {
            logger.warn("Domain not found [{}]", domain, e);
            return ToolResponse.error("Error: Domain '" + domain + "' not found.");
        } catch (ControlNotFoundException e) {
            logger.warn("Control [{}] not found in domain [{}]", controlId, domain, e);
            return ToolResponse.error("Error: Control " + controlId + " not found in domain '" + domain + "'.");
        }
    }
}
