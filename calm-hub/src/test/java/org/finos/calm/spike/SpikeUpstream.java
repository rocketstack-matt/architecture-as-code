package org.finos.calm.spike;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** A fake extension backend that answers {@code text/event-stream} in a few ways. */
public class SpikeUpstream implements QuarkusTestResourceLifecycleManager {

    /** Marks a test field that gets the upstream base URL. */
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.FIELD)
    public @interface Url {
    }

    private final AtomicInteger dripsCut = new AtomicInteger();
    private HttpServer server;

    @Override
    public Map<String, String> start() {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        server.setExecutor(Executors.newCachedThreadPool());
        server.createContext("/burst", exchange -> stream(exchange, out -> {
            for (int i = 1; i <= 3; i++) {
                event(out, i);
            }
        }));
        server.createContext("/stall", exchange -> stream(exchange, out -> {
            event(out, 1);
            sleep(30_000);
        }));
        server.createContext("/drip", exchange -> stream(exchange, out -> {
            try {
                for (int i = 1; ; i++) {
                    event(out, i);
                    sleep(200);
                }
            } catch (IOException e) {
                dripsCut.incrementAndGet();
                throw e;
            }
        }));
        server.createContext("/error", exchange -> {
            exchange.sendResponseHeaders(500, -1);
            exchange.close();
        });
        server.createContext("/stats", exchange -> {
            byte[] body = ("{\"dripsCut\":" + dripsCut.get() + "}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        // The returned map alone does not reach @ConfigProperty values (quarkusio/quarkus#52919),
        // as GitHubFixtureResource also notes.
        System.setProperty("calm.spike.sse.upstream", baseUrl());
        return Map.of("calm.spike.sse.upstream", baseUrl());
    }

    @Override
    public void inject(TestInjector testInjector) {
        testInjector.injectIntoFields(baseUrl(), new TestInjector.AnnotatedAndMatchesType(Url.class, String.class));
    }

    @Override
    public void stop() {
        if (server != null) {
            server.stop(0);
            System.clearProperty("calm.spike.sse.upstream");
        }
    }

    private String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private interface Body {
        void write(OutputStream out) throws IOException;
    }

    private static void stream(HttpExchange exchange, Body body) throws IOException {
        exchange.getResponseHeaders().add("Content-Type", "text/event-stream");
        exchange.sendResponseHeaders(200, 0);
        try (OutputStream out = exchange.getResponseBody()) {
            body.write(out);
        } finally {
            exchange.close();
        }
    }

    private static void event(OutputStream out, int id) throws IOException {
        out.write(("id: " + id + "\nevent: message\ndata: {\"n\":" + id + "}\n\n").getBytes(StandardCharsets.UTF_8));
        out.flush();
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
