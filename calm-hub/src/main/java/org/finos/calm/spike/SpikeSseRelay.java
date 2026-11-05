package org.finos.calm.spike;

import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Spike for the later {@code chat} point: relays an upstream {@code text/event-stream} with the
 * JDK {@link HttpClient}. The caller holds a permit for the life of the stream, so the number
 * of worker threads that streams can hold is bounded. The upstream is read through a line
 * subscriber that asks for one line at a time, so a stalled client stops the upstream read
 * and an idle upstream is noticed without a blocking read.
 */
@ApplicationScoped
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeSseRelay {

    private static final Logger logger = LoggerFactory.getLogger(SpikeSseRelay.class);
    private static final String END = "\u0000end";

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final Semaphore permits;
    private final AtomicInteger open = new AtomicInteger();

    @ConfigProperty(name = "calm.spike.sse.upstream", defaultValue = "http://localhost:1")
    String upstream;

    @ConfigProperty(name = "calm.spike.sse.idle-timeout", defaultValue = "PT30S")
    Duration idleTimeout;

    @ConfigProperty(name = "calm.spike.sse.max-duration", defaultValue = "PT5M")
    Duration maxDuration;

    @Inject
    public SpikeSseRelay(@ConfigProperty(name = "calm.spike.sse.max-concurrent", defaultValue = "4") int maxConcurrent) {
        this.permits = new Semaphore(maxConcurrent);
    }

    public int openStreams() {
        return open.get();
    }

    /** Returns null when every permit is in use. The caller must close the stream it gets. */
    public Stream open(String path) throws IOException {
        if (!permits.tryAcquire()) {
            return null;
        }
        open.incrementAndGet();
        Stream stream = new Stream();
        try {
            stream.connect(URI.create(upstream + "/" + path));
            return stream;
        } catch (IOException | RuntimeException e) {
            stream.close();
            throw e;
        }
    }

    public final class Stream implements AutoCloseable {
        private final LinkedBlockingQueue<String> lines = new LinkedBlockingQueue<>();
        private final CompletableFuture<Integer> status = new CompletableFuture<>();
        private volatile Flow.Subscription subscription;
        private CompletableFuture<HttpResponse<Void>> response;
        private boolean closed;

        private void connect(URI uri) throws IOException {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .header("Accept", "text/event-stream")
                    .GET()
                    .build();
            Flow.Subscriber<String> subscriber = new Flow.Subscriber<>() {
                @Override
                public void onSubscribe(Flow.Subscription s) {
                    subscription = s;
                    s.request(1);
                }

                @Override
                public void onNext(String line) {
                    lines.add(line);
                }

                @Override
                public void onError(Throwable t) {
                    lines.add(END);
                }

                @Override
                public void onComplete() {
                    lines.add(END);
                }
            };
            response = client.sendAsync(request, info -> {
                status.complete(info.statusCode());
                return info.statusCode() == 200
                        ? HttpResponse.BodySubscribers.fromLineSubscriber(subscriber)
                        : HttpResponse.BodySubscribers.discarding();
            });
            response.whenComplete((r, t) -> {
                if (t != null) {
                    status.completeExceptionally(t);
                }
            });
            int code;
            try {
                code = status.get(idleTimeout.toMillis(), TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                throw new IOException("Upstream sent no headers in " + idleTimeout);
            } catch (ExecutionException e) {
                throw new IOException("Upstream " + uri + " failed: " + e.getCause(), e.getCause());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("Interrupted", e);
            }
            if (code != 200) {
                throw new IOException("Upstream answered " + code);
            }
        }

        /** Copies events to {@code out} until the upstream ends, goes idle or runs too long. */
        public String pipeTo(OutputStream out) throws IOException {
            long deadline = System.nanoTime() + maxDuration.toNanos();
            try {
                while (true) {
                    long left = deadline - System.nanoTime();
                    if (left <= 0) {
                        return end(out, "max-duration");
                    }
                    String line = lines.poll(Math.min(left, idleTimeout.toNanos()), TimeUnit.NANOSECONDS);
                    if (line == null) {
                        return end(out, deadline - System.nanoTime() <= 0 ? "max-duration" : "idle-timeout");
                    }
                    if (END.equals(line)) {
                        return "complete";
                    }
                    out.write((line + "\n").getBytes(StandardCharsets.UTF_8));
                    if (line.isEmpty()) {
                        out.flush();
                    }
                    subscription.request(1);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "interrupted";
            }
        }

        private String end(OutputStream out, String reason) throws IOException {
            out.write(("\nevent: hub-error\ndata: {\"reason\":\"" + reason + "\"}\n\n").getBytes(StandardCharsets.UTF_8));
            out.flush();
            return reason;
        }

        @Override
        public synchronized void close() {
            if (closed) {
                return;
            }
            closed = true;
            Flow.Subscription s = subscription;
            if (s != null) {
                s.cancel();
            }
            if (response != null) {
                response.cancel(true);
            }
            open.decrementAndGet();
            permits.release();
            logger.debug("SSE relay stream closed");
        }
    }
}
