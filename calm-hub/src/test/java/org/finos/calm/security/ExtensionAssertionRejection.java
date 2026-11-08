package org.finos.calm.security;

import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static io.restassured.RestAssured.given;

/**
 * Each auth profile must fail a request that presents a CALM Hub extension assertion with 401, not
 * 500. Each subclass starts Hub in one profile.
 */
abstract class ExtensionAssertionRejection {

    static final String PROTECTED_PATH = "/api/calm/extensions/schema/0/blocks.schema.json";

    static String assertion() {
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String header = "{\"alg\":\"RS256\",\"typ\":\"calm-ext+jwt\",\"kid\":\"hub\"}";
        String claims = "{\"sub\":\"alice\",\"aud\":\"team-services\"}";
        return encoder.encodeToString(header.getBytes(StandardCharsets.UTF_8)) + "."
                + encoder.encodeToString(claims.getBytes(StandardCharsets.UTF_8)) + ".c2ln";
    }

    /** The headers that this profile needs, besides the assertion, to authenticate a caller. */
    RequestSpecification caller() {
        return given();
    }

    @Test
    void return_401_for_a_bearer_extension_assertion() {
        caller().header("Authorization", "Bearer " + assertion())
                .when().get(PROTECTED_PATH)
                .then().statusCode(401);
    }
}
