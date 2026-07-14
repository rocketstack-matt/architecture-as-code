package org.finos.calm.resources;

import io.quarkus.security.PermissionsAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.bson.json.JsonParseException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.finos.calm.domain.Pattern;
import org.finos.calm.domain.ValueWrapper;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.domain.exception.PatternNotFoundException;
import org.finos.calm.domain.exception.PatternVersionExistsException;
import org.finos.calm.domain.exception.PatternVersionNotFoundException;
import org.finos.calm.domain.pattern.CreatePatternRequest;
import org.finos.calm.security.CalmHubScopes;
import org.finos.calm.services.ThumbnailService;
import org.finos.calm.store.PatternStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.URISyntaxException;

import static org.finos.calm.resources.ResourceValidationConstants.NAMESPACE_MESSAGE;
import static org.finos.calm.resources.ResourceValidationConstants.NAMESPACE_REGEX;
import static org.finos.calm.resources.ResourceValidationConstants.STRICT_SANITIZATION_POLICY;
import static org.finos.calm.resources.ResourceValidationConstants.VERSION_MESSAGE;
import static org.finos.calm.resources.ResourceValidationConstants.VERSION_REGEX;

@Tag(name = "Storage API", description = "Numeric-ID based CALM storage endpoints")
@Path("/api/calm/namespaces")
public class PatternResource {

    private final PatternStore store;
    private final ThumbnailEndpointSupport thumbnails;

    private final Logger logger = LoggerFactory.getLogger(PatternResource.class);

    @ConfigProperty(name = "allow.put.operations", defaultValue = "false")
    Boolean allowPutOperations;

    @Inject
    public PatternResource(PatternStore store, ThumbnailEndpointSupport thumbnails) {
        this.store = store;
        this.thumbnails = thumbnails;
    }

    @GET
    @Path("{namespace}/patterns")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
            summary = "Retrieve patterns in a given namespace",
            description = "Patterns stored in a given namespace. Optional limit/offset query "
                    + "parameters page the result; when omitted the full list is returned. Offset "
                    + "is only applied alongside a limit."
    )
    @PermissionsAllowed(CalmHubScopes.READ)
    public Response getPatternsForNamespace(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @Valid @BeanParam PaginationQueryParams page
    ) {
        try {
            return Response.ok(new ValueWrapper<>(store.getPatternsForNamespace(namespace, page.toPageRequest()))).build();
        } catch (NamespaceNotFoundException e) {
            logger.error("Invalid namespace [{}] when retrieving patterns", namespace, e);
            return CalmResourceErrorResponses.invalidNamespaceResponse(namespace);
        }
    }

    @POST
    @Path("{namespace}/patterns")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
            summary = "Create pattern for namespace",
            description = "Creates a pattern for a given namespace with an allocated ID and version 1.0.0"
    )
    @PermissionsAllowed(CalmHubScopes.WRITE)
    public Response createPatternForNamespace(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @Valid @NotNull(message = "Request must not be null") CreatePatternRequest patternRequest
    ) throws URISyntaxException {
        try {
            Pattern persisted = store.createPatternForNamespace(patternRequest, namespace);
            triggerThumbnailRender(persisted);
            return patternWithLocationResponse(persisted);
        } catch (NamespaceNotFoundException e) {
            logger.error("Invalid namespace [{}] when creating pattern", namespace, e);
            return CalmResourceErrorResponses.invalidNamespaceResponse(namespace);
        } catch (JsonParseException e) {
            logger.error("Cannot parse Pattern JSON for namespace [{}]. Pattern JSON : [{}]", namespace, STRICT_SANITIZATION_POLICY.sanitize(patternRequest.getPatternJson()), e);
            return CalmResourceErrorResponses.invalidJsonResponse("pattern");
        }
    }

    @GET
    @Path("{namespace}/patterns/{patternId}/versions")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
            summary = "Retrieve a list of versions for a given pattern",
            description = "Pattern versions are not opinionated, outside of the first version created"
    )
    @PermissionsAllowed(CalmHubScopes.READ)
    public Response getPatternVersions(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @PathParam("patternId") int patternId
    ) {
        Pattern pattern = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(patternId)
                .build();

        try {
            return Response.ok(new ValueWrapper<>(store.getPatternVersions(pattern))).build();
        } catch (NamespaceNotFoundException e) {

            logger.error("Invalid namespace [{}] when getting versions of pattern", namespace, e);
            return CalmResourceErrorResponses.invalidNamespaceResponse(namespace);
        } catch (PatternNotFoundException e) {
            logger.error("Invalid pattern [{}] when getting versions of pattern", patternId, e);
            return invalidPatternResponse(patternId);
        }
    }

    @GET
    @Path("{namespace}/patterns/{patternId}/versions/{version}")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
            summary = "Retrieve a specific pattern at a given version",
            description = "Retrieve patterns at a specific version"
    )
    @PermissionsAllowed(CalmHubScopes.READ)
    public Response getPattern(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @PathParam("patternId") int patternId,
            @PathParam("version") @jakarta.validation.constraints.Pattern(regexp = VERSION_REGEX, message = VERSION_MESSAGE) String version
    ) {
        Pattern pattern = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(patternId)
                .setVersion(version)
                .build();

        try {
            return Response.ok(store.getPatternForVersion(pattern)).build();
        } catch (NamespaceNotFoundException e) {
            logger.error("Invalid namespace [{}] when getting a pattern", namespace, e);
            return CalmResourceErrorResponses.invalidNamespaceResponse(namespace);
        } catch (PatternNotFoundException e) {
            logger.error("Invalid pattern [{}] when getting a pattern", patternId, e);
            return invalidPatternResponse(patternId);
        } catch (PatternVersionNotFoundException e) {
            logger.error("Invalid version [{}] when getting a pattern", version, e);
            return invalidVersionResponse(version);
        }
    }

    @POST
    @Path("{namespace}/patterns/{patternId}/versions/{version}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
            summary = "Create a new version of an existing pattern",
            description = "Stores a new version of the pattern under the supplied {version}. The request body is an envelope containing the wrapper-level `name`, optional `description`, and the inner CALM `patternJson` document; only the inner document is persisted as the version contents, and the wrapper-level name/description used by the pattern listing endpoint are taken directly from the envelope fields."
    )
    @PermissionsAllowed(CalmHubScopes.WRITE)
    public Response createVersionedPattern(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @PathParam("patternId") int patternId,
            @PathParam("version") @jakarta.validation.constraints.Pattern(regexp = VERSION_REGEX, message = VERSION_MESSAGE) String version,
            @Valid @NotNull(message = "Request must not be null") CreatePatternRequest patternRequest
    ) throws URISyntaxException {
        Pattern pattern = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(patternId)
                .setVersion(version)
                .setName(patternRequest.getName())
                .setDescription(patternRequest.getDescription())
                .setPattern(patternRequest.getPatternJson())
                .build();

        try {
            store.createPatternForVersion(pattern);
            triggerThumbnailRender(pattern);
            return patternWithLocationResponse(pattern);
        } catch (PatternVersionExistsException e) {
            logger.error("Pattern version already exists [{}] when trying to create new pattern", pattern, e);
            return Response.status(Response.Status.CONFLICT).entity("Version already exists: " + version).build();
        } catch (PatternNotFoundException e) {
            logger.error("Invalid pattern [{}] when getting a pattern", pattern, e);
            return invalidPatternResponse(patternId);
        } catch (NamespaceNotFoundException e) {
            logger.error("Invalid namespace [{}] when getting a pattern", pattern, e);
            return CalmResourceErrorResponses.invalidNamespaceResponse(namespace);
        } catch (JsonParseException e) {
            logger.error("Cannot parse Pattern JSON for namespace [{}]. Pattern JSON : [{}]", namespace, STRICT_SANITIZATION_POLICY.sanitize(patternRequest.getPatternJson()), e);
            return CalmResourceErrorResponses.invalidJsonResponse("pattern");
        }
    }

    @PUT
    @Path("{namespace}/patterns/{patternId}/versions/{version}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(
            summary = "Updates a Pattern (if available)",
            description = "In mutable version stores pattern updates are supported by this endpoint, operation unavailable returned in repositories without configuration specified. The request body is the same envelope used by POST: only the inner `patternJson` is persisted as the new version contents, and the wrapper-level `name`/`description` shown by the listing endpoint are taken from the envelope fields."
    )
    @PermissionsAllowed({CalmHubScopes.WRITE})
    public Response updateVersionedPattern(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @PathParam("patternId") int patternId,
            @PathParam("version") @jakarta.validation.constraints.Pattern(regexp = VERSION_REGEX, message = VERSION_MESSAGE) String version,
            @Valid @NotNull(message = "Request must not be null") CreatePatternRequest patternRequest
    ) throws URISyntaxException {
        Pattern pattern = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(patternId)
                .setVersion(version)
                .setName(patternRequest.getName())
                .setDescription(patternRequest.getDescription())
                .setPattern(patternRequest.getPatternJson())
                .build();

        if (!allowPutOperations) {
            return Response.status(Response.Status.FORBIDDEN).entity("This Calm Hub does not support PUT operations").build();
        }

        try {
            store.updatePatternForVersion(pattern);
            triggerThumbnailRender(pattern);
            return patternWithLocationResponse(pattern);
        } catch (NamespaceNotFoundException e) {
            logger.error("Invalid namespace [{}] when trying to put pattern", pattern, e);
            return CalmResourceErrorResponses.invalidNamespaceResponse(namespace);
        } catch (PatternNotFoundException e) {
            logger.error("Invalid pattern [{}] when trying to put pattern", pattern, e);
            return invalidPatternResponse(patternId);
        } catch (JsonParseException e) {
            logger.error("Cannot parse Pattern JSON for namespace [{}]. Pattern JSON : [{}]", namespace, STRICT_SANITIZATION_POLICY.sanitize(patternRequest.getPatternJson()), e);
            return CalmResourceErrorResponses.invalidJsonResponse("pattern");
        }


    }

    @GET
    @Path("{namespace}/patterns/{patternId}/versions/{version}/thumbnail")
    @Produces("image/png")
    @Operation(
            summary = "Retrieve the rendered thumbnail for a pattern version",
            description = "Returns the PNG thumbnail rendered for this pattern version. When absent and a "
                    + "render service is configured, a synchronous render is attempted before returning 404."
    )
    @PermissionsAllowed(CalmHubScopes.READ)
    public Response getPatternThumbnail(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @PathParam("patternId") int patternId,
            @PathParam("version") @jakarta.validation.constraints.Pattern(regexp = VERSION_REGEX, message = VERSION_MESSAGE) String version
    ) {
        Pattern pattern = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(patternId)
                .setVersion(version)
                .build();

        return patternThumbnailResponse(pattern);
    }

    @GET
    @Path("{namespace}/patterns/{patternId}/thumbnail")
    @Produces("image/png")
    @Operation(
            summary = "Retrieve the rendered thumbnail for a pattern's latest version",
            description = "Returns the PNG thumbnail of the latest stored version of the pattern. When absent "
                    + "and a render service is configured, a synchronous render is attempted before returning 404."
    )
    @PermissionsAllowed(CalmHubScopes.READ)
    public Response getLatestPatternThumbnail(
            @PathParam("namespace") @jakarta.validation.constraints.Pattern(regexp = NAMESPACE_REGEX, message = NAMESPACE_MESSAGE) String namespace,
            @PathParam("patternId") int patternId
    ) {
        Pattern pattern = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(patternId)
                .build();

        return thumbnails.latestThumbnailResponse(pattern,
                () -> store.getPatternVersions(pattern),
                version -> patternThumbnailResponse(new Pattern.PatternBuilder()
                        .setNamespace(namespace)
                        .setId(patternId)
                        .setVersion(version)
                        .build()));
    }

    /** Thumbnail flow shared with ArchitectureResource — see {@link ThumbnailEndpointSupport}. */
    private Response patternThumbnailResponse(Pattern pattern) {
        return thumbnails.thumbnailResponse(
                thumbnailKey(pattern),
                ThumbnailService.DOCUMENT_TYPE_PATTERN,
                pattern,
                () -> store.getThumbnail(pattern),
                () -> store.getPatternForVersion(pattern),
                bytes -> store.storeThumbnail(pattern, bytes));
    }

    /** Fire-and-forget render after a successful write; never affects the write response. */
    private void triggerThumbnailRender(Pattern pattern) {
        thumbnails.triggerThumbnailRender(
                thumbnailKey(pattern),
                ThumbnailService.DOCUMENT_TYPE_PATTERN,
                pattern.getPatternJson(),
                pattern,
                bytes -> store.storeThumbnail(pattern, bytes));
    }

    /** Single-flight render key: {@code namespace/patterns/id/version}. */
    private String thumbnailKey(Pattern pattern) {
        return pattern.getNamespace() + "/patterns/" + pattern.getId() + "/" + pattern.getDotVersion();
    }

    private Response patternWithLocationResponse(Pattern pattern) throws URISyntaxException {
        return Response.created(new URI("/api/calm/namespaces/" + pattern.getNamespace() + "/patterns/" + pattern.getId() + "/versions/" + pattern.getDotVersion())).build();
    }
    private Response invalidPatternResponse(int patternId) {
        return Response.status(Response.Status.NOT_FOUND).entity("Invalid pattern provided: " + patternId).build();
    }

    private Response invalidVersionResponse(String version) {
        return Response.status(Response.Status.NOT_FOUND).entity("Invalid version provided: " + version).build();
    }
}
