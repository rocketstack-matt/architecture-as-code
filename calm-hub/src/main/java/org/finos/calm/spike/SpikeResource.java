package org.finos.calm.spike;

import io.quarkus.arc.properties.IfBuildProperty;
import io.smallrye.jwt.algorithm.SignatureAlgorithm;
import io.vertx.json.schema.SchemaException;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

/**
 * HTTP face of the I0 spike, so the same black-box tests run in JVM mode and against a native
 * image. Built only with {@code -Dcalm.spike.enabled=true}. Not for merge.
 */
@Path("/spike")
@Produces(MediaType.APPLICATION_JSON)
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeResource {

    @Inject
    SpikeTokenSigner signer;

    @Inject
    SpikeSchemaValidator schemaValidator;

    @Inject
    SpikeCdiProbe cdiProbe;

    @GET
    @Path("jwt/{alg}")
    public Response token(@PathParam("alg") String alg, @QueryParam("sub") String sub, @QueryParam("aud") String aud) {
        if (sub == null || sub.isBlank() || aud == null || aud.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "sub and aud are required")).build();
        }
        SignatureAlgorithm algorithm;
        try {
            algorithm = SignatureAlgorithm.fromAlgorithm(alg);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "unknown algorithm")).build();
        }
        if (algorithm != SignatureAlgorithm.RS256 && algorithm != SignatureAlgorithm.ES256) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "only RS256 and ES256")).build();
        }
        return Response.ok(Map.of("token", signer.sign(algorithm, sub, aud))).build();
    }

    @GET
    @Path("jwks")
    public Map<String, Object> jwks() {
        return Map.of("keys", signer.jwks());
    }

    @POST
    @Path("schema/validate")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response validate(String body) {
        try {
            return Response.ok(schemaValidator.validate(body)).build();
        } catch (SchemaException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", String.valueOf(e.getMessage()))).build();
        }
    }

    @GET
    @Path("cdi")
    public Map<String, String> cdi() {
        return cdiProbe.probe();
    }
}
