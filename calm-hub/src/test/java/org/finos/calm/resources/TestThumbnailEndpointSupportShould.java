package org.finos.calm.resources;

import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.finos.calm.domain.exception.ArchitectureNotFoundException;
import org.finos.calm.domain.exception.ArchitectureVersionNotFoundException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.services.ThumbnailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class TestThumbnailEndpointSupportShould {

    private static final byte[] PNG_BYTES = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final String KEY = "finos/architectures/12/1.0.0";
    private static final String DOCUMENT_TYPE = ThumbnailService.DOCUMENT_TYPE_ARCHITECTURE;
    private static final String DOCUMENT_JSON = "{\"nodes\": []}";
    private static final String LOG_CONTEXT = "architecture-12";

    @Mock
    private ThumbnailService thumbnailService;

    private ThumbnailEndpointSupport support;

    @BeforeEach
    public void setup() {
        support = new ThumbnailEndpointSupport(thumbnailService);
    }

    // --- thumbnailResponse ---

    @Test
    public void return_the_stored_thumbnail_with_private_caching_on_a_hit() throws Exception {
        Response response = support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> PNG_BYTES,
                () -> DOCUMENT_JSON,
                png -> { });

        assertThat(response.getStatus(), is(200));
        assertThat(response.getMediaType().toString(), is("image/png"));
        assertThat(response.getHeaderString("Cache-Control"), is("private, max-age=300"));
        assertArrayEquals(PNG_BYTES, (byte[]) response.getEntity());
        verify(thumbnailService, never()).renderSync(anyString(), anyString(), anyString(), any());
    }

    @Test
    public void return_a_text_plain_404_on_a_miss_when_rendering_is_disabled() {
        when(thumbnailService.isEnabled()).thenReturn(false);

        Response response = support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> null,
                () -> DOCUMENT_JSON,
                png -> { });

        assertThat(response.getStatus(), is(404));
        assertThat(response.getMediaType(), is(MediaType.TEXT_PLAIN_TYPE));
        assertThat(response.getEntity(), is("No thumbnail available"));
        verify(thumbnailService, never()).renderSync(anyString(), anyString(), anyString(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void render_on_demand_and_store_the_result_on_a_miss() {
        when(thumbnailService.isEnabled()).thenReturn(true);
        when(thumbnailService.renderSync(eq(KEY), eq(DOCUMENT_TYPE), eq(DOCUMENT_JSON), any()))
                .thenAnswer(invocation -> {
                    // The render service invokes the store callback with the fresh bytes.
                    invocation.getArgument(3, Consumer.class).accept(PNG_BYTES);
                    return Optional.of(PNG_BYTES);
                });
        AtomicReference<byte[]> stored = new AtomicReference<>();

        Response response = support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> null,
                () -> DOCUMENT_JSON,
                stored::set);

        assertThat(response.getStatus(), is(200));
        assertArrayEquals(PNG_BYTES, (byte[]) response.getEntity());
        // The fresh render was persisted through the store seam.
        assertArrayEquals(PNG_BYTES, stored.get());
    }

    @Test
    public void return_a_404_when_the_on_demand_render_fails() {
        when(thumbnailService.isEnabled()).thenReturn(true);
        when(thumbnailService.renderSync(eq(KEY), eq(DOCUMENT_TYPE), eq(DOCUMENT_JSON), any()))
                .thenReturn(Optional.empty());

        Response response = support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> null,
                () -> DOCUMENT_JSON,
                png -> { });

        assertThat(response.getStatus(), is(404));
    }

    @Test
    public void return_a_404_when_the_stored_thumbnail_lookup_throws_a_domain_exception() {
        Response response = support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> {
                    throw new NamespaceNotFoundException();
                },
                () -> DOCUMENT_JSON,
                png -> { });

        assertThat(response.getStatus(), is(404));
    }

    @Test
    public void return_a_404_when_the_document_load_throws_a_domain_exception() {
        when(thumbnailService.isEnabled()).thenReturn(true);

        Response response = support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> null,
                () -> {
                    throw new ArchitectureVersionNotFoundException();
                },
                png -> { });

        assertThat(response.getStatus(), is(404));
        verify(thumbnailService, never()).renderSync(anyString(), anyString(), anyString(), any());
    }

    @Test
    public void propagate_a_runtime_exception_from_the_thumbnail_lookup() {
        assertThrows(IllegalStateException.class, () -> support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> {
                    throw new IllegalStateException("store blew up");
                },
                () -> DOCUMENT_JSON,
                png -> { }));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void swallow_a_store_failure_from_the_on_demand_render_and_still_serve_the_bytes() {
        when(thumbnailService.isEnabled()).thenReturn(true);
        when(thumbnailService.renderSync(eq(KEY), eq(DOCUMENT_TYPE), eq(DOCUMENT_JSON), any()))
                .thenAnswer(invocation -> {
                    invocation.getArgument(3, Consumer.class).accept(PNG_BYTES);
                    return Optional.of(PNG_BYTES);
                });

        Response response = support.thumbnailResponse(KEY, DOCUMENT_TYPE, LOG_CONTEXT,
                () -> null,
                () -> DOCUMENT_JSON,
                png -> {
                    throw new ArchitectureNotFoundException();
                });

        assertThat(response.getStatus(), is(200));
        assertArrayEquals(PNG_BYTES, (byte[]) response.getEntity());
    }

    // --- latestThumbnailResponse ---

    @Test
    public void resolve_the_latest_version_numerically_and_delegate_to_the_version_response() {
        Response expected = Response.ok().build();
        AtomicReference<String> resolvedVersion = new AtomicReference<>();

        Response response = support.latestThumbnailResponse(LOG_CONTEXT,
                // 10.0.0 is latest under numeric segment comparison (lexical would pick 9.0.0)
                () -> List.of("1.0.0", "10.0.0", "9.0.0"),
                version -> {
                    resolvedVersion.set(version);
                    return expected;
                });

        assertThat(response, is(expected));
        assertThat(resolvedVersion.get(), is("10.0.0"));
    }

    @Test
    public void return_a_404_when_there_are_no_versions_to_resolve() {
        Response response = support.latestThumbnailResponse(LOG_CONTEXT,
                List::of,
                version -> Response.ok().build());

        assertThat(response.getStatus(), is(404));
        assertThat(response.getMediaType(), is(MediaType.TEXT_PLAIN_TYPE));
    }

    @Test
    public void return_a_404_when_the_version_lookup_throws_a_domain_exception() {
        Response response = support.latestThumbnailResponse(LOG_CONTEXT,
                () -> {
                    throw new ArchitectureNotFoundException();
                },
                version -> Response.ok().build());

        assertThat(response.getStatus(), is(404));
    }

    @Test
    public void propagate_a_runtime_exception_from_the_version_lookup() {
        assertThrows(IllegalStateException.class, () -> support.latestThumbnailResponse(LOG_CONTEXT,
                () -> {
                    throw new IllegalStateException("store blew up");
                },
                version -> Response.ok().build()));
    }

    // --- triggerThumbnailRender ---

    @Test
    @SuppressWarnings("unchecked")
    public void trigger_an_async_render_and_store_the_result_through_the_seam() {
        AtomicReference<byte[]> stored = new AtomicReference<>();

        support.triggerThumbnailRender(KEY, DOCUMENT_TYPE, DOCUMENT_JSON, LOG_CONTEXT, stored::set);

        ArgumentCaptor<Consumer<byte[]>> callback = ArgumentCaptor.forClass(Consumer.class);
        verify(thumbnailService, times(1)).triggerRender(eq(KEY), eq(DOCUMENT_TYPE), eq(DOCUMENT_JSON), callback.capture());

        // Simulate the async render completing: the callback persists via the store seam.
        callback.getValue().accept(PNG_BYTES);
        assertArrayEquals(PNG_BYTES, stored.get());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void swallow_a_store_failure_from_the_async_render_callback() {
        support.triggerThumbnailRender(KEY, DOCUMENT_TYPE, DOCUMENT_JSON, LOG_CONTEXT, png -> {
            throw new NamespaceNotFoundException();
        });

        ArgumentCaptor<Consumer<byte[]>> callback = ArgumentCaptor.forClass(Consumer.class);
        verify(thumbnailService, times(1)).triggerRender(eq(KEY), eq(DOCUMENT_TYPE), eq(DOCUMENT_JSON), callback.capture());

        assertDoesNotThrow(() -> callback.getValue().accept(PNG_BYTES));
    }
}
