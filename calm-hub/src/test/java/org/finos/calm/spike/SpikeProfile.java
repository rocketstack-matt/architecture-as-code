package org.finos.calm.spike;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

/**
 * Standalone (Nitrite) mode with no Dev Services, so the spike needs no Docker. Auth is on,
 * and {@link SpikeHeaderAuthMechanism} reads the user from a header.
 */
public class SpikeProfile implements QuarkusTestProfile {

    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.ofEntries(
                Map.entry("calm.spike.enabled", "true"),
                Map.entry("calm.database.mode", "standalone"),
                Map.entry("calm.standalone.data-directory", "target/spike-data-" + System.nanoTime()),
                Map.entry("quarkus.devservices.enabled", "false"),
                Map.entry("quarkus.mongodb.devservices.enabled", "false"),
                Map.entry("quarkus.mongodb.health.enabled", "false"),
                Map.entry("calm.auth.enabled", "true"),
                Map.entry("calm.mcp.enabled", "true"),
                Map.entry("calm.spike.sse.idle-timeout", "PT1S"),
                Map.entry("calm.spike.sse.max-duration", "PT3S"),
                Map.entry("calm.spike.sse.max-concurrent", "2"));
    }
}
