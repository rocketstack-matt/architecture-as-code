package org.finos.calm.spike;

import io.quarkus.test.junit.QuarkusIntegrationTest;

/** Runs {@link TestSpikeMcpShould} against the packaged app: the jar, or the native image with -Pnative. */
@QuarkusIntegrationTest
class SpikeMcpIntegration extends TestSpikeMcpShould {
}
