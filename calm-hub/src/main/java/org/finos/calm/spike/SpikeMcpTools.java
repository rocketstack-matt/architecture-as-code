package org.finos.calm.spike;

import io.quarkiverse.mcp.server.ToolManager;
import io.quarkiverse.mcp.server.ToolResponse;
import io.quarkus.arc.properties.IfBuildProperty;
import io.quarkus.runtime.StartupEvent;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.finos.calm.domain.UserAccess;
import org.finos.calm.domain.exception.NamespaceAlreadyExistsException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.security.CalmHubPermissionChecker;
import org.finos.calm.store.NamespaceStore;
import org.finos.calm.store.UserAccessStore;

import java.util.List;
import java.util.Map;

/**
 * Spike for ADR 0014: registers extension commands as MCP tools at start up with
 * {@link ToolManager}, and checks the caller in the handler, because
 * {@code @PermissionsAllowed} cannot go on a lambda.
 */
@ApplicationScoped
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeMcpTools {

    static final String SEED_NAMESPACE = "spike";
    static final String SEED_USER = "alice";

    private static final Map<String, Object> INPUT_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of("namespace", Map.of("type", "string")),
            "required", List.of("namespace"),
            "additionalProperties", false);

    private static final Map<String, Object> OUTPUT_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "principal", Map.of("type", "string"),
                    "namespace", Map.of("type", "string"),
                    "thread", Map.of("type", "string")),
            "required", List.of("principal", "namespace"));

    @Inject
    ToolManager toolManager;

    @Inject
    SecurityIdentity identity;

    @Inject
    CalmHubPermissionChecker permissionChecker;

    @Inject
    NamespaceStore namespaceStore;

    @Inject
    UserAccessStore userAccessStore;

    void register(@Observes StartupEvent event) {
        seedGrant();
        // Registered out of name order on purpose, to see the order tools/list uses.
        for (String name : List.of("ext_zeta_whoami", "ext_alpha_whoami")) {
            toolManager.newTool(name)
                    .setTitle("Who am I (" + name + ")")
                    .setDescription("Spike: returns the caller's principal if they can read the namespace.")
                    .setInputSchema(INPUT_SCHEMA)
                    .setOutputSchema(OUTPUT_SCHEMA)
                    .setAnnotations(new ToolManager.ToolAnnotations(null, true, false, true, false))
                    .setHandler(args -> whoami(args.args()))
                    .register();
        }
    }

    ToolResponse whoami(Map<String, Object> args) {
        if (identity.isAnonymous()) {
            return ToolResponse.error("Error: authentication required.");
        }
        Object namespace = args.get("namespace");
        if (!(namespace instanceof String ns)) {
            return ToolResponse.error("Error: namespace is required.");
        }
        if (!permissionChecker.canRead(identity, ns)) {
            return ToolResponse.error("Error: " + identity.getPrincipal().getName() + " cannot read " + ns + ".");
        }
        return ToolResponse.structuredSuccess(Map.of(
                "principal", identity.getPrincipal().getName(),
                "namespace", ns,
                "thread", Thread.currentThread().getName()));
    }

    // The black-box tests cannot reach the stores, so the spike seeds one READ grant: alice on "spike".
    private void seedGrant() {
        try {
            if (!namespaceStore.namespaceExists(SEED_NAMESPACE)) {
                namespaceStore.createNamespace(SEED_NAMESPACE, "I0 spike");
            }
            if (userAccessStore.getGrantsForUser(SEED_USER).isEmpty()) {
                userAccessStore.createUserAccessForNamespace(new UserAccess(SEED_USER, UserAccess.Permission.read, SEED_NAMESPACE));
            }
        } catch (NamespaceAlreadyExistsException | NamespaceNotFoundException e) {
            throw new IllegalStateException("Cannot seed the spike grant", e);
        }
    }
}
