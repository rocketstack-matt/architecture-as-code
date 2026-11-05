package org.finos.calm.spike;

import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

/**
 * Q4 (ADR 0016): which beans an ArC {@code @Decorator} applies to. CDI 4.0 section 8.1 limits
 * decorators to managed beans, and ArC follows it: a producer-method bean is not decorated.
 */
@QuarkusTest
@TestProfile(SpikeProfile.class)
@WithTestResource(SpikeUpstream.class)
public class TestSpikeCdiDecoratorShould {

    @Test
    void decorate_a_class_bean_but_not_a_producer_method_bean() {
        given().get("/spike/cdi").then().statusCode(200)
                .body("classBean", equalTo("decorated(stored:x)"))
                .body("producerMethodBean", equalTo("stored:x"))
                .body("producerReturnsWrapper", equalTo("observed(stored:x)"));
    }
}
