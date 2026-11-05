package org.finos.calm.spike;

import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;

import java.io.IOException;
import java.util.Map;

/**
 * RESTEasy Classic has no reactive return type here, so the stream runs on the request's
 * worker thread through {@link StreamingOutput}. {@link SpikeSseRelay} bounds how many run.
 */
@Path("/spike/sse")
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeSseResource {

    @Inject
    SpikeSseRelay relay;

    @GET
    @Path("stream/{scenario}")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public Response stream(@PathParam("scenario") String scenario) {
        SpikeSseRelay.Stream stream;
        try {
            stream = relay.open(scenario);
        } catch (IOException e) {
            return Response.status(Response.Status.BAD_GATEWAY).type(MediaType.TEXT_PLAIN).entity(e.getMessage()).build();
        }
        if (stream == null) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE).type(MediaType.TEXT_PLAIN)
                    .header("Retry-After", "5").entity("Too many open streams").build();
        }
        StreamingOutput body = out -> {
            try (stream) {
                stream.pipeTo(out);
            }
        };
        return Response.ok(body, MediaType.SERVER_SENT_EVENTS)
                .header("Cache-Control", "no-cache")
                .header("X-Accel-Buffering", "no")
                .build();
    }

    @GET
    @Path("open")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Integer> open() {
        return Map.of("open", relay.openStreams());
    }
}
