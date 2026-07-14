package org.finos.calm.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * Client for the calm-server thumbnail render endpoint.
 *
 * <p>Asks a configured calm-server instance ({@code calm.render.service-url}) to render a PNG
 * thumbnail of an architecture or pattern document by driving this hub's own UI in a headless
 * browser, so the thumbnail is pixel-identical to the diagram users see.</p>
 *
 * <p>The feature is disabled gracefully when {@code calm.render.service-url} is unset/empty:
 * every method becomes a no-op / returns empty. Render failures are never propagated to
 * callers — a failed render only means a missing thumbnail.</p>
 *
 * <p><b>Single-flight:</b> renders are keyed by {@code namespace/type/id/version}; concurrent
 * requests for the same key (e.g. several browse pages hitting the same missing thumbnail)
 * collapse onto one in-flight render.</p>
 *
 * <p><b>Failure caching:</b> a failed render (or a failed thumbnail store, e.g. in read-only
 * mode) is remembered per key for {@code calm.render.failure-cache-ttl-ms} (default 60s).
 * Read-path misses within the TTL return empty immediately instead of re-attempting a doomed
 * render on every page view; write-path renders are never gated (a new write means new content
 * worth rendering) and a successful render+store clears the cached failure.</p>
 */
@ApplicationScoped
public class ThumbnailService {

    public static final String DOCUMENT_TYPE_ARCHITECTURE = "architecture";
    public static final String DOCUMENT_TYPE_PATTERN = "pattern";

    private static final String RENDER_PATH = "/calm/render/thumbnail";
    /** Extra grace on the whole HTTP exchange beyond the render timeout requested of calm-server. */
    private static final long TIMEOUT_GRACE_MS = 5000;

    private final Logger logger = LoggerFactory.getLogger(ThumbnailService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String renderServiceUrl;
    private final String uiBaseUrl;
    private final long timeoutMs;
    private final long failureCacheTtlMs;
    private final HttpClient httpClient;

    /** In-flight renders keyed by {@code namespace/type/id/version} (single-flight). */
    private final ConcurrentHashMap<String, CompletableFuture<Optional<byte[]>>> inFlight = new ConcurrentHashMap<>();

    /** Recent per-key render/store failures (epoch millis) gating read-path retries. */
    private final ConcurrentHashMap<String, Long> recentFailures = new ConcurrentHashMap<>();

    /** A single-flight render attempt: the shared future and whether this call started it. */
    private record RenderAttempt(CompletableFuture<Optional<byte[]>> future, boolean owner) {
    }

    @Inject
    public ThumbnailService(
            // Optional because SmallRye rejects an empty-string defaultValue: absent == disabled.
            @ConfigProperty(name = "calm.render.service-url") Optional<String> renderServiceUrl,
            @ConfigProperty(name = "calm.hub.base-url", defaultValue = "http://localhost:8080") String uiBaseUrl,
            @ConfigProperty(name = "calm.render.timeout-ms", defaultValue = "20000") long timeoutMs,
            @ConfigProperty(name = "calm.render.failure-cache-ttl-ms", defaultValue = "60000") long failureCacheTtlMs) {
        this(renderServiceUrl.orElse(""), uiBaseUrl, timeoutMs, failureCacheTtlMs, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build());
    }

    /** Visible-for-testing constructor allowing an injected {@link HttpClient}. */
    ThumbnailService(String renderServiceUrl, String uiBaseUrl, long timeoutMs, long failureCacheTtlMs, HttpClient httpClient) {
        // Trailing slashes are stripped so a configured base URL of "http://host:3000/"
        // doesn't produce a double-slash render path (mirrors calm-server's uiBaseUrl handling).
        this.renderServiceUrl = renderServiceUrl == null ? "" : renderServiceUrl.trim().replaceAll("/+$", "");
        this.uiBaseUrl = uiBaseUrl;
        this.timeoutMs = timeoutMs;
        this.failureCacheTtlMs = failureCacheTtlMs;
        this.httpClient = httpClient;
    }

    /**
     * Whether thumbnail rendering is configured. When false all render methods are no-ops.
     *
     * @return true when {@code calm.render.service-url} is set
     */
    public boolean isEnabled() {
        return !renderServiceUrl.isEmpty();
    }

    /**
     * Fire-and-forget render used on the document write path. Kicks off an asynchronous render
     * and invokes {@code storeCallback} with the PNG bytes on success. Failures (including a
     * throwing callback) are logged and swallowed — this method NEVER throws to the caller, so
     * a render problem cannot fail a document write.
     *
     * @param key           single-flight key, {@code namespace/type/id/version}
     * @param documentType  {@link #DOCUMENT_TYPE_ARCHITECTURE} or {@link #DOCUMENT_TYPE_PATTERN}
     * @param documentJson  the raw CALM JSON document as a string
     * @param storeCallback invoked with the PNG bytes when the render succeeds
     */
    public void triggerRender(String key, String documentType, String documentJson, Consumer<byte[]> storeCallback) {
        if (!isEnabled()) {
            return;
        }
        try {
            RenderAttempt attempt = renderSingleFlight(key, documentType, documentJson, storeCallback);
            if (!attempt.owner()) {
                // A render for this key was already in flight — necessarily of an older
                // (or at best equal) document, whose result would be stale for this write.
                // Chain exactly one follow-up render of THIS write's document after the
                // in-flight one completes. Bounded: the follow-up is itself single-flight,
                // so writes that join it don't chain off each other indefinitely.
                attempt.future().whenComplete((result, t) -> {
                    try {
                        renderSingleFlight(key, documentType, documentJson, storeCallback);
                    } catch (Exception e) {
                        logger.debug("Failed to re-render thumbnail after in-flight render for [{}]", key, e);
                    }
                });
            }
        } catch (Exception e) {
            logger.debug("Failed to trigger thumbnail render for [{}]", key, e);
        }
    }

    /**
     * Blocking render used by the GET-miss (self-healing) path. Waits for the render to complete,
     * bounded by {@code calm.render.timeout-ms} (+grace). Concurrent calls for the same key
     * collapse onto a single render. On success {@code storeCallback} is invoked with the bytes
     * before they are returned.
     *
     * @param key           single-flight key, {@code namespace/type/id/version}
     * @param documentType  {@link #DOCUMENT_TYPE_ARCHITECTURE} or {@link #DOCUMENT_TYPE_PATTERN}
     * @param documentJson  the raw CALM JSON document as a string
     * @param storeCallback invoked with the PNG bytes when the render succeeds
     * @return the PNG bytes, or empty when disabled, recently failed, or the render failed
     */
    public Optional<byte[]> renderSync(String key, String documentType, String documentJson, Consumer<byte[]> storeCallback) {
        if (!isEnabled()) {
            return Optional.empty();
        }
        if (isRecentlyFailed(key)) {
            logger.debug("Skipping thumbnail render for [{}]: failed within the last {}ms", key, failureCacheTtlMs);
            return Optional.empty();
        }
        try {
            return renderSingleFlight(key, documentType, documentJson, storeCallback).future().join();
        } catch (Exception e) {
            logger.debug("Thumbnail render failed for [{}]", key, e);
            return Optional.empty();
        }
    }

    private boolean isRecentlyFailed(String key) {
        Long failedAt = recentFailures.get(key);
        if (failedAt == null) {
            return false;
        }
        if (System.currentTimeMillis() - failedAt >= failureCacheTtlMs) {
            recentFailures.remove(key, failedAt);
            return false;
        }
        return true;
    }

    private RenderAttempt renderSingleFlight(
            String key, String documentType, String documentJson, Consumer<byte[]> storeCallback) {
        // The render pipeline must start only AFTER the future is inserted: kicking it
        // off inside computeIfAbsent's mapping function would let a synchronously
        // completing render run whenComplete's inFlight.remove during the compute —
        // a forbidden recursive map modification that silently loses the cleanup.
        AtomicBoolean owner = new AtomicBoolean(false);
        CompletableFuture<Optional<byte[]>> future = inFlight.computeIfAbsent(key, k -> {
            owner.set(true);
            return new CompletableFuture<>();
        });
        if (owner.get()) {
            sendRenderRequest(documentType, documentJson)
                    .thenApply(png -> {
                        boolean stored = png.isPresent() && safeStore(key, png.get(), storeCallback);
                        if (stored) {
                            recentFailures.remove(key);
                        } else {
                            // Failed render OR failed store (e.g. read-only mode): remember it
                            // so read-path misses don't re-attempt on every page view.
                            recentFailures.put(key, System.currentTimeMillis());
                        }
                        return png;
                    })
                    .exceptionally(t -> {
                        logger.debug("Thumbnail render request failed for [{}]", key, t);
                        recentFailures.put(key, System.currentTimeMillis());
                        return Optional.<byte[]>empty();
                    })
                    .whenComplete((result, t) -> {
                        // Remove before completing so a caller observing completion
                        // and re-requesting always triggers a fresh render.
                        inFlight.remove(key);
                        future.complete(result == null ? Optional.empty() : result);
                    });
        }
        return new RenderAttempt(future, owner.get());
    }

    private CompletableFuture<Optional<byte[]>> sendRenderRequest(String documentType, String documentJson) {
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("uiBaseUrl", uiBaseUrl);
            body.put("documentType", documentType);
            body.put("documentJson", documentJson);
            body.put("timeoutMs", timeoutMs);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(renderServiceUrl + RENDER_PATH))
                    .timeout(Duration.ofMillis(timeoutMs + TIMEOUT_GRACE_MS))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofByteArray())
                    .orTimeout(timeoutMs + TIMEOUT_GRACE_MS, TimeUnit.MILLISECONDS)
                    .thenApply(response -> {
                        if (response.statusCode() == 200) {
                            return Optional.of(response.body());
                        }
                        logger.debug("Thumbnail render service returned status [{}]", response.statusCode());
                        return Optional.empty();
                    });
        } catch (Exception e) {
            return CompletableFuture.failedFuture(e);
        }
    }

    private boolean safeStore(String key, byte[] bytes, Consumer<byte[]> storeCallback) {
        try {
            storeCallback.accept(bytes);
            return true;
        } catch (Exception e) {
            logger.debug("Failed to store rendered thumbnail for [{}]", key, e);
            return false;
        }
    }

    /**
     * Picks the latest version from a list, mirroring the Hub UI's
     * {@code pickLatestVersion} ordering semantics (calm-hub-ui/src/model/version.ts):
     * split on dots and compare segment-by-segment, numerically where both segments
     * are numeric (a missing trailing segment counts as 0), falling back to a string
     * compare for non-numeric segments.
     *
     * @param versions the available dot-format versions
     * @return the latest version, or empty when the list is empty
     */
    public static Optional<String> pickLatestVersion(List<String> versions) {
        if (versions == null || versions.isEmpty()) {
            return Optional.empty();
        }
        return versions.stream().max(Comparator.comparing(v -> v, ThumbnailService::compareVersions));
    }

    private static int compareVersions(String a, String b) {
        String[] segsA = a.split("\\.");
        String[] segsB = b.split("\\.");
        int len = Math.max(segsA.length, segsB.length);
        for (int i = 0; i < len; i++) {
            String rawA = i < segsA.length ? segsA[i] : "";
            String rawB = i < segsB.length ? segsB[i] : "";
            Long numA = parseSegment(rawA, i >= segsA.length);
            Long numB = parseSegment(rawB, i >= segsB.length);
            if (numA != null && numB != null) {
                int cmp = Long.compare(numA, numB);
                if (cmp != 0) {
                    return cmp;
                }
            } else if (!rawA.equals(rawB)) {
                return rawA.compareTo(rawB);
            }
        }
        return 0;
    }

    /** Numeric value of a segment, a missing trailing segment counting as 0; null when non-numeric. */
    private static Long parseSegment(String raw, boolean missing) {
        if (missing) {
            return 0L;
        }
        if (raw.isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
