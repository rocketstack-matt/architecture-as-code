package org.finos.calm.security;

import io.quarkus.test.junit.QuarkusTest;

/** The default profile has auth on and no mechanism, so it refuses every caller. */
@QuarkusTest
class TestExtensionAssertionRejectionDefaultShould extends ExtensionAssertionRejection {
}
