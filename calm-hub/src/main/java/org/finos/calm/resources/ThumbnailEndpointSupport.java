package org.finos.calm.resources;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.finos.calm.services.ThumbnailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * Shared implementation of the thumbnail endpoint flow used by
 * {@link ArchitectureResource} and {@link PatternResource}: serve the stored
 * thumbnail, self-heal a miss with a synchronous render, resolve "latest"
 * versions, and fire the write-path render trigger. The per-type variation
 * (store lookups, document type, single-flight key, domain exceptions) comes in
 * as functional parameters; response building (200 png + Cache-Control,
 * text/plain 404) lives here once.
 */
@ApplicationScoped
public class ThumbnailEndpointSupport {

    private final ThumbnailService thumbnailService;
    private final Logger logger = LoggerFactory.getLogger(ThumbnailEndpointSupport.class);

    @Inject
    public ThumbnailEndpointSupport(ThumbnailService thumbnailService) {
        this.thumbnailService = thumbnailService;
    }

    /** Store lookup throwing the resource type's checked domain exceptions. */
    @FunctionalInterface
    public interface ThumbnailSupplier<T> {
        T get() throws Exception;
    }

    /** Store write throwing the resource type's checked domain exceptions. */
    @FunctionalInterface
    public interface ThumbnailStore {
        void store(byte[] png) throws Exception;
    }

    /**
     * Serves the stored thumbnail for one resource version, attempting a
     * self-healing synchronous render on a miss (single-flight per version).
     * Checked (domain) exceptions resolve to a 404 — thumbnails are best-effort —
     * while runtime exceptions propagate unchanged.
     *
     * @param key                 single-flight key, {@code namespace/type/id/version}
     * @param documentType        {@link ThumbnailService#DOCUMENT_TYPE_ARCHITECTURE} or
     *                            {@link ThumbnailService#DOCUMENT_TYPE_PATTERN}
     * @param logContext          the domain object, logged on failure paths
     * @param loadStoredThumbnail store lookup for the stored PNG (null = miss)
     * @param loadDocumentJson    store lookup for the version's raw CALM JSON
     * @param storeThumbnail      store write for a freshly rendered PNG
     */
    public Response thumbnailResponse(String key, String documentType, Object logContext,
                                      ThumbnailSupplier<byte[]> loadStoredThumbnail,
                                      ThumbnailSupplier<String> loadDocumentJson,
                                      ThumbnailStore storeThumbnail) {
        try {
            byte[] png = loadStoredThumbnail.get();
            if (png == null) {
                png = renderOnDemand(key, documentType, loadDocumentJson, storeThumbnail);
            }
            if (png == null) {
                return thumbnailNotFoundResponse();
            }
            return Response.ok(png)
                    .type("image/png")
                    .header("Cache-Control", "private, max-age=300")
                    .build();
        } catch (RuntimeException e) {
            // Only the stores' checked domain exceptions mean "no thumbnail here".
            throw e;
        } catch (Exception e) {
            logger.debug("Thumbnail requested for unknown resource version [{}]", logContext, e);
            return thumbnailNotFoundResponse();
        }
    }

    /**
     * Resolves the resource's latest stored version (mirroring the UI's
     * {@code pickLatestVersion} ordering) and delegates to {@code versionThumbnail}.
     *
     * @param logContext       the domain object, logged on failure paths
     * @param versionsSupplier store lookup for the resource's version list
     * @param versionThumbnail builds the response for the resolved latest version
     */
    public Response latestThumbnailResponse(Object logContext,
                                            ThumbnailSupplier<List<String>> versionsSupplier,
                                            Function<String, Response> versionThumbnail) {
        try {
            Optional<String> latest = ThumbnailService.pickLatestVersion(versionsSupplier.get());
            if (latest.isEmpty()) {
                return thumbnailNotFoundResponse();
            }
            return versionThumbnail.apply(latest.get());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            logger.debug("Could not resolve latest version for thumbnail [{}]", logContext, e);
            return thumbnailNotFoundResponse();
        }
    }

    /** Fire-and-forget render after a successful write; never affects the write response. */
    public void triggerThumbnailRender(String key, String documentType, String documentJson,
                                       Object logContext, ThumbnailStore storeThumbnail) {
        thumbnailService.triggerRender(key, documentType, documentJson,
                bytes -> storeQuietly(logContext, bytes, storeThumbnail));
    }

    private byte[] renderOnDemand(String key, String documentType,
                                  ThumbnailSupplier<String> loadDocumentJson,
                                  ThumbnailStore storeThumbnail) throws Exception {
        if (!thumbnailService.isEnabled()) {
            return null;
        }
        String documentJson = loadDocumentJson.get();
        return thumbnailService.renderSync(key, documentType, documentJson,
                        bytes -> storeQuietly(key, bytes, storeThumbnail))
                .orElse(null);
    }

    private void storeQuietly(Object logContext, byte[] bytes, ThumbnailStore storeThumbnail) {
        try {
            storeThumbnail.store(bytes);
        } catch (Exception e) {
            logger.debug("Could not store rendered thumbnail for [{}]", logContext, e);
        }
    }

    private Response thumbnailNotFoundResponse() {
        // Explicit text/plain: the thumbnail endpoints @Produces image/png, and a text
        // entity must not be negotiated onto the image media type.
        return Response.status(Response.Status.NOT_FOUND).entity("No thumbnail available").type(MediaType.TEXT_PLAIN).build();
    }
}
