package org.finos.calm.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class TestThumbnailServiceShould {

    private static final byte[] PNG_BYTES = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final String UI_BASE_URL = "http://localhost:8080";
    private static final long TIMEOUT_MS = 20000;
    private static final long FAILURE_TTL_MS = 60000;
    private static final String DOCUMENT_JSON = "{\"nodes\": []}";

    private final ObjectMapper objectMapper = new ObjectMapper();

    // --- Disabled mode ---

    @Test
    void be_disabled_and_never_call_the_render_service_when_no_url_is_configured() {
        HttpClient mockClient = mock(HttpClient.class);
        ThumbnailService service = new ThumbnailService("", UI_BASE_URL, TIMEOUT_MS, FAILURE_TTL_MS, mockClient);

        assertThat(service.isEnabled(), is(false));

        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);
        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, callback), is(Optional.empty()));
        assertDoesNotThrow(() -> service.triggerRender("k", "architecture", DOCUMENT_JSON, callback));

        verify(mockClient, never()).sendAsync(any(), any());
        verify(callback, never()).accept(any());
    }

    // --- Contract against a real HTTP server ---

    private HttpServer server;
    private final AtomicReference<String> capturedBody = new AtomicReference<>();
    private final AtomicReference<String> capturedPath = new AtomicReference<>();
    private final AtomicInteger responseStatus = new AtomicInteger(200);
    private final AtomicInteger requestCount = new AtomicInteger(0);

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/calm/render/thumbnail", exchange -> {
            requestCount.incrementAndGet();
            capturedPath.set(exchange.getRequestURI().getPath());
            capturedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            int status = responseStatus.get();
            byte[] payload = status == 200 ? PNG_BYTES : "{\"error\":\"render failed\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", status == 200 ? "image/png" : "application/json");
            exchange.sendResponseHeaders(status, payload.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(payload);
            }
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private ThumbnailService serviceAgainstFixture() {
        return serviceAgainstFixture(FAILURE_TTL_MS);
    }

    private ThumbnailService serviceAgainstFixture(long failureCacheTtlMs) {
        String url = "http://127.0.0.1:" + server.getAddress().getPort();
        return new ThumbnailService(url, UI_BASE_URL, TIMEOUT_MS, failureCacheTtlMs, HttpClient.newHttpClient());
    }

    @Test
    void normalise_a_trailing_slash_on_the_render_service_url() throws Exception {
        // A configured base URL of "http://host:3000/" must not produce a
        // "//calm/render/thumbnail" request path.
        String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/";
        ThumbnailService service = new ThumbnailService(url, UI_BASE_URL, TIMEOUT_MS, FAILURE_TTL_MS, HttpClient.newHttpClient());
        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);

        Optional<byte[]> result = service.renderSync("finos/architectures/1/1.0.0", "architecture", DOCUMENT_JSON, callback);

        assertTrue(result.isPresent());
        assertThat(capturedPath.get(), is("/calm/render/thumbnail"));
    }

    @Test
    void post_the_render_contract_body_and_return_the_png_bytes() throws Exception {
        ThumbnailService service = serviceAgainstFixture();
        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);

        Optional<byte[]> result = service.renderSync("finos/architectures/1/1.0.0", "architecture", DOCUMENT_JSON, callback);

        assertTrue(result.isPresent());
        assertArrayEquals(PNG_BYTES, result.get());
        verify(callback, times(1)).accept(PNG_BYTES);

        // Contract 1: uiBaseUrl + documentType + documentJson (string) + timeoutMs
        JsonNode body = objectMapper.readTree(capturedBody.get());
        assertThat(body.get("uiBaseUrl").asText(), is(UI_BASE_URL));
        assertThat(body.get("documentType").asText(), is("architecture"));
        assertThat(body.get("documentJson").asText(), is(DOCUMENT_JSON));
        assertThat(body.get("timeoutMs").asLong(), is(TIMEOUT_MS));
    }

    @Test
    void return_empty_and_skip_the_store_callback_when_the_render_service_errors() {
        responseStatus.set(500);
        ThumbnailService service = serviceAgainstFixture();
        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);

        Optional<byte[]> result = service.renderSync("k", "pattern", DOCUMENT_JSON, callback);

        assertThat(result, is(Optional.empty()));
        verify(callback, never()).accept(any());
    }

    @Test
    void return_empty_rather_than_throw_when_the_render_service_is_unreachable() {
        // A closed port: connection refused must resolve to empty, not an exception.
        server.stop(0);
        ThumbnailService service = serviceAgainstFixture();
        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);

        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, callback), is(Optional.empty()));
        verify(callback, never()).accept(any());
    }

    @Test
    void still_return_the_bytes_when_the_store_callback_throws() {
        ThumbnailService service = serviceAgainstFixture();

        Optional<byte[]> result = service.renderSync("k", "architecture", DOCUMENT_JSON, bytes -> {
            throw new IllegalStateException("store blew up");
        });

        assertTrue(result.isPresent());
        assertArrayEquals(PNG_BYTES, result.get());
    }

    @Test
    void never_throw_from_the_async_trigger_when_the_render_fails() throws Exception {
        responseStatus.set(500);
        ThumbnailService service = serviceAgainstFixture();
        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);

        assertDoesNotThrow(() -> service.triggerRender("k", "architecture", DOCUMENT_JSON, callback));

        // Wait for the async request to land, then confirm the failure was swallowed.
        awaitRequests(1);
        verify(callback, never()).accept(any());
    }

    @Test
    void invoke_the_store_callback_from_the_async_trigger_on_success() throws Exception {
        ThumbnailService service = serviceAgainstFixture();
        CountDownLatch stored = new CountDownLatch(1);
        AtomicReference<byte[]> storedBytes = new AtomicReference<>();

        service.triggerRender("k", "pattern", DOCUMENT_JSON, bytes -> {
            storedBytes.set(bytes);
            stored.countDown();
        });

        assertTrue(stored.await(10, TimeUnit.SECONDS), "store callback was not invoked");
        assertArrayEquals(PNG_BYTES, storedBytes.get());
        JsonNode body = objectMapper.readTree(capturedBody.get());
        assertThat(body.get("documentType").asText(), is("pattern"));
    }

    private void awaitRequests(int expected) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 10000;
        while (requestCount.get() < expected && System.currentTimeMillis() < deadline) {
            Thread.sleep(20);
        }
        assertThat(requestCount.get(), is(expected));
    }

    // --- Single-flight ---

    @Test
    @SuppressWarnings("unchecked")
    void collapse_concurrent_renders_for_the_same_key_onto_one_request() throws Exception {
        HttpClient mockClient = mock(HttpClient.class);
        HttpResponse<byte[]> response = (HttpResponse<byte[]>) mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn(PNG_BYTES);

        // A slow fake renderer: the future is only completed once both callers are waiting.
        CompletableFuture<HttpResponse<byte[]>> slowRender = new CompletableFuture<>();
        when(mockClient.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(slowRender);

        ThumbnailService service = new ThumbnailService("http://render.example", UI_BASE_URL, TIMEOUT_MS, FAILURE_TTL_MS, mockClient);
        AtomicInteger storeCount = new AtomicInteger(0);
        Consumer<byte[]> callback = bytes -> storeCount.incrementAndGet();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch bothStarted = new CountDownLatch(2);
            Future<Optional<byte[]>> first = executor.submit(() -> {
                bothStarted.countDown();
                return service.renderSync("same/key", "architecture", DOCUMENT_JSON, callback);
            });
            Future<Optional<byte[]>> second = executor.submit(() -> {
                bothStarted.countDown();
                return service.renderSync("same/key", "architecture", DOCUMENT_JSON, callback);
            });

            // Give both callers time to join the in-flight render, then complete it.
            assertTrue(bothStarted.await(10, TimeUnit.SECONDS));
            Thread.sleep(200);
            slowRender.complete(response);

            assertArrayEquals(PNG_BYTES, first.get(10, TimeUnit.SECONDS).orElseThrow());
            assertArrayEquals(PNG_BYTES, second.get(10, TimeUnit.SECONDS).orElseThrow());
        } finally {
            executor.shutdownNow();
        }

        // One render and one store despite two concurrent callers.
        verify(mockClient, times(1)).sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
        assertThat(storeCount.get(), is(1));
    }

    @Test
    @SuppressWarnings("unchecked")
    void render_again_for_the_same_key_once_the_previous_render_completed() {
        HttpClient mockClient = mock(HttpClient.class);
        HttpResponse<byte[]> response = (HttpResponse<byte[]>) mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn(PNG_BYTES);
        when(mockClient.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(CompletableFuture.completedFuture(response));

        ThumbnailService service = new ThumbnailService("http://render.example", UI_BASE_URL, TIMEOUT_MS, FAILURE_TTL_MS, mockClient);
        Consumer<byte[]> callback = bytes -> { };

        service.renderSync("same/key", "architecture", DOCUMENT_JSON, callback);
        service.renderSync("same/key", "architecture", DOCUMENT_JSON, callback);

        // The single-flight map is cleaned on completion, so a later miss re-renders.
        verify(mockClient, times(2)).sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    // --- Latest-version selection (mirrors calm-hub-ui/src/model/version.ts) ---

    @Test
    void pick_the_highest_version_comparing_segments_numerically() {
        assertThat(ThumbnailService.pickLatestVersion(List.of("1.0.0", "2.1.0", "2.0.0")), is(Optional.of("2.1.0")));
        // Numeric per-segment compare: 10 > 9 (a lexical compare would pick 9.0.0).
        assertThat(ThumbnailService.pickLatestVersion(List.of("9.0.0", "10.0.0")), is(Optional.of("10.0.0")));
        assertThat(ThumbnailService.pickLatestVersion(List.of("3.4.5")), is(Optional.of("3.4.5")));
    }

    @Test
    void treat_missing_trailing_segments_as_zero_when_picking_the_latest_version() {
        // "1.0" and "1.0.0" compare equal; max keeps the first encountered.
        assertThat(ThumbnailService.pickLatestVersion(List.of("1.0", "1.0.1")), is(Optional.of("1.0.1")));
    }

    @Test
    void fall_back_to_string_comparison_for_non_numeric_segments() {
        assertThat(ThumbnailService.pickLatestVersion(List.of("1.0.0-alpha", "1.0.0-beta")), is(Optional.of("1.0.0-beta")));
    }

    @Test
    void return_empty_when_picking_the_latest_of_no_versions() {
        assertThat(ThumbnailService.pickLatestVersion(List.of()), is(Optional.empty()));
        assertThat(ThumbnailService.pickLatestVersion(null), is(Optional.empty()));
    }

    // --- Failure caching ---

    @Test
    public void skip_the_read_path_render_while_a_recent_failure_is_cached() {
        responseStatus.set(500);
        ThumbnailService service = serviceAgainstFixture();
        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);

        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, callback), is(Optional.empty()));
        // The second miss within the TTL must not hit the render service again.
        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, callback), is(Optional.empty()));

        assertThat(requestCount.get(), is(1));
        verify(callback, never()).accept(any());
    }

    @Test
    public void cache_a_failed_thumbnail_store_like_a_failed_render() {
        // Render succeeds but the store callback throws (e.g. read-only mode): the
        // failure must be cached so the next read-path miss doesn't re-render.
        ThumbnailService service = serviceAgainstFixture();
        Consumer<byte[]> throwingStore = bytes -> {
            throw new IllegalStateException("read-only");
        };

        assertTrue(service.renderSync("k", "architecture", DOCUMENT_JSON, throwingStore).isPresent());
        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, throwingStore), is(Optional.empty()));

        assertThat(requestCount.get(), is(1));
    }

    @Test
    public void re_attempt_the_render_once_the_failure_cache_ttl_expires() throws Exception {
        responseStatus.set(500);
        ThumbnailService service = serviceAgainstFixture(1);
        @SuppressWarnings("unchecked")
        Consumer<byte[]> callback = mock(Consumer.class);

        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, callback), is(Optional.empty()));
        Thread.sleep(50);
        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, callback), is(Optional.empty()));

        assertThat(requestCount.get(), is(2));
    }

    @Test
    public void clear_the_cached_failure_after_a_successful_render_and_store() throws Exception {
        responseStatus.set(500);
        ThumbnailService service = serviceAgainstFixture();

        // Read-path failure is cached...
        assertThat(service.renderSync("k", "architecture", DOCUMENT_JSON, bytes -> { }), is(Optional.empty()));
        assertThat(requestCount.get(), is(1));

        // ...but the write path is never gated, and its success clears the cache.
        responseStatus.set(200);
        CountDownLatch stored = new CountDownLatch(1);
        service.triggerRender("k", "architecture", DOCUMENT_JSON, bytes -> stored.countDown());
        assertTrue(stored.await(10, TimeUnit.SECONDS), "write-path render did not store");

        // A read-path miss now renders again instead of returning the cached failure.
        assertTrue(service.renderSync("k", "architecture", DOCUMENT_JSON, bytes -> { }).isPresent());
        assertThat(requestCount.get(), is(3));
    }

    // --- Write path re-render after joining an in-flight render ---

    @Test
    @SuppressWarnings("unchecked")
    public void re_render_a_write_that_joined_an_in_flight_render_of_an_older_document() {
        HttpClient mockClient = mock(HttpClient.class);
        HttpResponse<byte[]> response = (HttpResponse<byte[]>) mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn(PNG_BYTES);

        CompletableFuture<HttpResponse<byte[]>> firstRender = new CompletableFuture<>();
        when(mockClient.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(firstRender)
                .thenReturn(CompletableFuture.completedFuture(response));

        ThumbnailService service = new ThumbnailService("http://render.example", UI_BASE_URL, TIMEOUT_MS, FAILURE_TTL_MS, mockClient);
        AtomicInteger storeCount = new AtomicInteger(0);
        Consumer<byte[]> callback = bytes -> storeCount.incrementAndGet();

        // First write starts the render; second write (newer document) joins it and
        // must chain exactly one follow-up render once the first completes.
        service.triggerRender("same/key", "architecture", "{\"v\":1}", callback);
        service.triggerRender("same/key", "architecture", "{\"v\":2}", callback);
        verify(mockClient, times(1)).sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));

        firstRender.complete(response);

        verify(mockClient, timeout(10000).times(2)).sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
}
