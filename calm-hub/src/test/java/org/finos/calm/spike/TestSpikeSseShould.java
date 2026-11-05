package org.finos.calm.spike;

import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Q5: a RESTEasy Classic resource relays an upstream event stream. The profile sets a 1 s idle
 * timeout, a 3 s max duration and 2 streams at most.
 */
@QuarkusTest
@TestProfile(SpikeProfile.class)
@WithTestResource(SpikeUpstream.class)
public class TestSpikeSseShould {

    private final HttpClient client = HttpClient.newHttpClient();

    @TestHTTPResource("/spike/sse")
    URI base;

    @SpikeUpstream.Url
    String upstream;

    @AfterEach
    void allStreamsClosed() throws InterruptedException {
        waitForOpenStreams(0, Duration.ofSeconds(5));
    }

    @Test
    void relay_a_stream_that_ends_upstream() {
        given().get("/spike/sse/stream/burst").then().log().ifValidationFails().statusCode(200)
                .header("Content-Type", startsWith("text/event-stream"))
                .body(containsString("data: {\"n\":3}"))
                .body(not(containsString("hub-error")));
    }

    @Test
    void send_each_event_before_the_upstream_ends() throws Exception {
        long start = System.nanoTime();
        HttpResponse<InputStream> response = open("drip");
        try (BufferedReader reader = reader(response)) {
            String first = nextData(reader);
            long firstMillis = (System.nanoTime() - start) / 1_000_000;
            System.out.println("[spike] first event after " + firstMillis + " ms: " + first);
            assertEquals("data: {\"n\":1}", first);
            assertTrue(firstMillis < 1000, "first event took " + firstMillis + " ms");
        }
    }

    @Test
    void end_an_idle_stream_with_an_error_event() {
        long start = System.nanoTime();
        String body = given().get("/spike/sse/stream/stall").then().statusCode(200).extract().asString();
        long millis = (System.nanoTime() - start) / 1_000_000;
        System.out.println("[spike] stall ended after " + millis + " ms");
        assertTrue(body.contains("data: {\"n\":1}"));
        assertTrue(body.contains("event: hub-error\ndata: {\"reason\":\"idle-timeout\"}"), body);
        assertTrue(millis >= 900 && millis < 2500, "ended after " + millis + " ms");
    }

    @Test
    void end_a_long_stream_at_the_max_duration() {
        long start = System.nanoTime();
        String body = given().get("/spike/sse/stream/drip").then().statusCode(200).extract().asString();
        long millis = (System.nanoTime() - start) / 1_000_000;
        System.out.println("[spike] drip ended after " + millis + " ms");
        assertTrue(body.contains("event: hub-error\ndata: {\"reason\":\"max-duration\"}"), body);
        assertTrue(millis >= 2900 && millis < 4500, "ended after " + millis + " ms");
    }

    @Test
    void answer_502_when_the_upstream_fails() {
        given().get("/spike/sse/stream/error").then().statusCode(502);
    }

    @Test
    void answer_503_when_every_stream_permit_is_in_use() throws Exception {
        try (BufferedReader one = reader(open("drip")); BufferedReader two = reader(open("drip"))) {
            nextData(one);
            nextData(two);
            given().get("/spike/sse/stream/burst").then().statusCode(503).header("Retry-After", "5");
        }
        waitForOpenStreams(0, Duration.ofSeconds(2));
        given().get("/spike/sse/stream/burst").then().statusCode(200);
    }

    @Test
    void free_the_permit_and_cut_the_upstream_when_the_client_goes() throws Exception {
        int cutBefore = dripsCut();
        long start = System.nanoTime();
        try (BufferedReader reader = reader(open("drip"))) {
            nextData(reader);
        }
        waitForOpenStreams(0, Duration.ofSeconds(2));
        long millis = (System.nanoTime() - start) / 1_000_000;
        System.out.println("[spike] permit freed " + millis + " ms after open");
        assertTrue(millis < 2500, "freed by the max duration, not by the disconnect: " + millis + " ms");
        long deadline = System.nanoTime() + Duration.ofSeconds(2).toNanos();
        while (dripsCut() == cutBefore && System.nanoTime() < deadline) {
            Thread.sleep(50);
        }
        assertEquals(cutBefore + 1, dripsCut(), "upstream connection was not cut");
    }

    private HttpResponse<InputStream> open(String scenario) throws Exception {
        HttpResponse<InputStream> response = client.send(
                HttpRequest.newBuilder(URI.create(base + "/stream/" + scenario)).build(),
                HttpResponse.BodyHandlers.ofInputStream());
        assertEquals(200, response.statusCode());
        return response;
    }

    private static BufferedReader reader(HttpResponse<InputStream> response) {
        return new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8));
    }

    private static String nextData(BufferedReader reader) throws Exception {
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.startsWith("data:")) {
                return line;
            }
        }
        throw new AssertionError("stream ended with no data line");
    }

    private int dripsCut() throws Exception {
        String body = client.send(HttpRequest.newBuilder(URI.create(upstream + "/stats")).build(),
                HttpResponse.BodyHandlers.ofString()).body();
        return new io.vertx.core.json.JsonObject(body).getInteger("dripsCut");
    }

    private static void waitForOpenStreams(int expected, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (System.nanoTime() < deadline) {
            if (given().get("/spike/sse/open").then().extract().<Integer>path("open") == expected) {
                return;
            }
            Thread.sleep(50);
        }
        given().get("/spike/sse/open").then().body("open", equalTo(expected));
    }
}
