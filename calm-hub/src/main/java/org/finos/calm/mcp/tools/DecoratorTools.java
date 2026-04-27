package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.Tool;
import io.quarkiverse.mcp.server.Tool.OutputSchema;
import io.quarkiverse.mcp.server.ToolArg;
import io.quarkiverse.mcp.server.ToolResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.finos.calm.domain.Decorator;
import org.finos.calm.domain.exception.DecoratorNotFoundException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.mcp.results.McpResults.CreateDecoratorResult;
import org.finos.calm.mcp.results.McpResults.DecoratorDetailResult;
import org.finos.calm.mcp.results.McpResults.DecoratorListResult;
import org.finos.calm.mcp.results.McpResults.DecoratorSummary;
import org.finos.calm.mcp.results.McpResults.DecoratorView;
import org.finos.calm.mcp.results.McpResults.UpdateDecoratorResult;
import org.finos.calm.store.DecoratorStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;

/**
 * MCP tool provider for decorator resources. Exposes CRUD operations on
 * decorators (e.g. threat models, deployments) within CalmHub namespaces
 * via the Quarkiverse MCP server.
 *
 * <p>All success responses use structured content; clients should read
 * {@link ToolResponse#structuredContent()} rather than the text body.</p>
 */
@ApplicationScoped
public class DecoratorTools {

    private static final Logger logger = LoggerFactory.getLogger(DecoratorTools.class);

    @Inject
    @ConfigProperty(name = "calm.mcp.enabled", defaultValue = "true")
    boolean mcpEnabled;

    @Inject
    DecoratorStore decoratorStore;

    @Tool(
            description = "List decorators in a namespace, optionally filtered by target architecture path and/or type (e.g. 'threat-model', 'deployment').",
            outputSchema = @OutputSchema(from = DecoratorListResult.class))
    public ToolResponse listDecorators(
            @ToolArg(description = "The namespace to list decorators from") String namespace,
            @ToolArg(description = "Filter by target path (e.g. '/calm/namespaces/workshop/architectures/1/versions/1-0-0')", required = false) String target,
            @ToolArg(description = "Filter by decorator type (e.g. 'threat-model', 'deployment')", required = false) String type) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateNamespace(namespace);
        if (error != null) {
            return ToolResponse.error(error);
        }

        try {
            String targetFilter = (target != null && !target.isBlank()) ? target : null;
            String typeFilter = (type != null && !type.isBlank()) ? type : null;

            List<Decorator> decorators = decoratorStore.getDecoratorValuesForNamespace(namespace, targetFilter, typeFilter);
            List<DecoratorSummary> summaries = decorators.stream()
                    .map(d -> new DecoratorSummary(d.getUniqueId(), d.getType(), d.getTarget()))
                    .toList();
            return ToolResponse.structuredSuccess(new DecoratorListResult(namespace, summaries));
        } catch (NamespaceNotFoundException e) {
            logger.warn("Namespace not found [{}]", namespace, e);
            return ToolResponse.error("Error: Namespace '" + namespace + "' not found.");
        }
    }

    @Tool(
            description = "Get a specific decorator by its numeric ID in a namespace. Returns the full decorator JSON including data payload.",
            outputSchema = @OutputSchema(from = DecoratorDetailResult.class))
    public ToolResponse getDecorator(
            @ToolArg(description = "The namespace containing the decorator") String namespace,
            @ToolArg(description = "The decorator numeric ID (positive integer)") int decoratorId) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateNamespace(namespace);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validatePositiveId(decoratorId, "Decorator ID");
        if (error != null) {
            return ToolResponse.error(error);
        }

        try {
            Optional<Decorator> decorator = decoratorStore.getDecoratorById(namespace, decoratorId);
            if (decorator.isEmpty()) {
                return ToolResponse.error("Error: Decorator " + decoratorId + " not found in namespace '" + namespace + "'.");
            }
            return ToolResponse.structuredSuccess(
                    new DecoratorDetailResult(namespace, decoratorId, toView(decorator.get())));
        } catch (NamespaceNotFoundException e) {
            logger.warn("Namespace not found [{}]", namespace, e);
            return ToolResponse.error("Error: Namespace '" + namespace + "' not found.");
        }
    }

    @Tool(
            description = "Create a new decorator in a namespace. Use this to store threat model results, deployments, or other decorator data. Returns the assigned decorator ID.",
            outputSchema = @OutputSchema(from = CreateDecoratorResult.class))
    public ToolResponse createDecorator(
            @ToolArg(description = "The namespace to create the decorator in") String namespace,
            @ToolArg(description = "The decorator JSON payload (must include $schema, unique-id, type, target, target-type, applies-to, and data fields)") String decoratorJson) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateNamespace(namespace);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateNotBlank(decoratorJson, "Decorator JSON");
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateJson(decoratorJson, "Decorator JSON");
        if (error != null) {
            return ToolResponse.error(error);
        }

        try {
            int id = decoratorStore.createDecorator(namespace, decoratorJson);
            logger.info("Decorator created with ID [{}] in namespace [{}]", id, namespace);
            return ToolResponse.structuredSuccess(
                    new CreateDecoratorResult(namespace, id, "Decorator created successfully."));
        } catch (NamespaceNotFoundException e) {
            logger.warn("Namespace not found [{}]", namespace, e);
            return ToolResponse.error("Error: Namespace '" + namespace + "' not found.");
        }
    }

    @Tool(
            description = "Update an existing decorator in a namespace. Returns the updated decorator representation.",
            outputSchema = @OutputSchema(from = UpdateDecoratorResult.class))
    public ToolResponse updateDecorator(
            @ToolArg(description = "The namespace containing the decorator") String namespace,
            @ToolArg(description = "The decorator numeric ID to update (positive integer)") int decoratorId,
            @ToolArg(description = "The updated decorator JSON payload") String decoratorJson) {
        String error = McpValidationHelper.checkEnabled(mcpEnabled);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateNamespace(namespace);
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validatePositiveId(decoratorId, "Decorator ID");
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateNotBlank(decoratorJson, "Decorator JSON");
        if (error != null) {
            return ToolResponse.error(error);
        }
        error = McpValidationHelper.validateJson(decoratorJson, "Decorator JSON");
        if (error != null) {
            return ToolResponse.error(error);
        }

        try {
            decoratorStore.updateDecorator(namespace, decoratorId, decoratorJson);
            logger.info("Decorator [{}] updated in namespace [{}]", decoratorId, namespace);
            // Return updated representation so callers can verify the change without a follow-up getDecorator call
            Optional<Decorator> updated = decoratorStore.getDecoratorById(namespace, decoratorId);
            DecoratorView view = updated.map(DecoratorTools::toView).orElse(null);
            return ToolResponse.structuredSuccess(
                    new UpdateDecoratorResult(namespace, decoratorId, view, "Decorator updated successfully."));
        } catch (NamespaceNotFoundException e) {
            logger.warn("Namespace not found [{}]", namespace, e);
            return ToolResponse.error("Error: Namespace '" + namespace + "' not found.");
        } catch (DecoratorNotFoundException e) {
            logger.warn("Decorator [{}] not found in namespace [{}]", decoratorId, namespace, e);
            return ToolResponse.error("Error: Decorator " + decoratorId + " not found in namespace '" + namespace + "'.");
        }
    }

    private static DecoratorView toView(Decorator d) {
        return new DecoratorView(
                d.getUniqueId(),
                d.getType(),
                d.getTarget(),
                d.getTargetType(),
                d.getAppliesTo(),
                d.getData());
    }
}
