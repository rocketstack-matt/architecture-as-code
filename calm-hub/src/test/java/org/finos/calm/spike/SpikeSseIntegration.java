package org.finos.calm.spike;

import io.quarkus.test.junit.QuarkusIntegrationTest;

/** Runs {@link TestSpikeSseShould} against the packaged app: the jar, or the native image with -Pnative. */
@QuarkusIntegrationTest
class SpikeSseIntegration extends TestSpikeSseShould {
}
