package org.finos.calm.spike;

import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.restassured.path.json.JsonPath;
import io.vertx.core.json.JsonObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Q1: Hub signs RS256 and ES256 with smallrye-jwt-build. The token is checked with plain JDK
 * crypto and the published JWK only, as an extension would.
 */
@QuarkusTest
@TestProfile(SpikeProfile.class)
@WithTestResource(SpikeUpstream.class)
public class TestSpikeJwtShould {

    private static final Set<String> FIRST_CUT_CLAIMS = Set.of(
            "iss", "sub", "aud", "iat", "exp", "jti", "auth", "hubApi", "route", "scope", "ns", "htm", "htp");

    @Test
    void sign_an_rs256_token_that_verifies_against_the_jwks() throws Exception {
        String[] parts = token("RS256");
        JsonObject header = decode(parts[0]);
        assertEquals("RS256", header.getString("alg"));
        assertEquals(SpikeTokenSigner.TYPE, header.getString("typ"));

        Map<String, String> jwk = jwk(header.getString("kid"));
        assertEquals("RSA", jwk.get("kty"));
        PublicKey key = KeyFactory.getInstance("RSA").generatePublic(
                new RSAPublicKeySpec(unsigned(jwk.get("n")), unsigned(jwk.get("e"))));
        assertTrue(verify("SHA256withRSA", key, parts));
        assertClaims(decode(parts[1]));
    }

    @Test
    void sign_an_es256_token_that_verifies_against_the_jwks() throws Exception {
        String[] parts = token("ES256");
        JsonObject header = decode(parts[0]);
        assertEquals("ES256", header.getString("alg"));

        Map<String, String> jwk = jwk(header.getString("kid"));
        assertEquals("P-256", jwk.get("crv"));
        AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
        params.init(new ECGenParameterSpec("secp256r1"));
        PublicKey key = KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(
                new ECPoint(unsigned(jwk.get("x")), unsigned(jwk.get("y"))), params.getParameterSpec(ECParameterSpec.class)));
        // JWS ES256 is the raw 64-byte R||S form (RFC 7518 3.4), not DER.
        assertEquals(64, Base64.getUrlDecoder().decode(parts[2]).length);
        assertTrue(verify("SHA256withECDSAinP1363Format", key, parts));
        assertClaims(decode(parts[1]));
    }

    @Test
    void fail_verification_when_the_payload_is_changed() throws Exception {
        String[] parts = token("RS256");
        Map<String, String> jwk = jwk(decode(parts[0]).getString("kid"));
        PublicKey key = KeyFactory.getInstance("RSA").generatePublic(
                new RSAPublicKeySpec(unsigned(jwk.get("n")), unsigned(jwk.get("e"))));
        String forged = Base64.getUrlEncoder().withoutPadding().encodeToString(
                decode(parts[1]).put("sub", "mallory").encode().getBytes(StandardCharsets.UTF_8));
        assertFalse(verify("SHA256withRSA", key, new String[]{parts[0], forged, parts[2]}));
    }

    @Test
    void reject_a_request_with_no_subject_or_audience() {
        given().get("/spike/jwt/RS256?sub=alice").then().statusCode(400);
        given().get("/spike/jwt/RS256?aud=ext-demo").then().statusCode(400);
    }

    @ParameterizedTest
    @ValueSource(strings = {"HS256", "none-such"})
    void reject_algorithms_other_than_rs256_and_es256(String alg) {
        given().get("/spike/jwt/" + alg + "?sub=alice&aud=ext-demo")
                .then().statusCode(400).body("error", notNullValue());
    }

    private static void assertClaims(JsonObject claims) {
        assertTrue(claims.fieldNames().containsAll(FIRST_CUT_CLAIMS), "claims: " + claims.fieldNames());
        assertEquals("alice", claims.getString("sub"));
        assertEquals("ext-demo", claims.getString("aud"));
        assertEquals(60, claims.getLong("exp") - claims.getLong("iat"));
    }

    private static String[] token(String alg) {
        String token = given().get("/spike/jwt/" + alg + "?sub=alice&aud=ext-demo")
                .then().statusCode(200).extract().path("token");
        String[] parts = token.split("\\.");
        assertEquals(3, parts.length);
        return parts;
    }

    private static Map<String, String> jwk(String kid) {
        List<Map<String, String>> keys = JsonPath.from(given().get("/spike/jwks").then().statusCode(200)
                .extract().asString()).getList("keys");
        return keys.stream().filter(k -> kid.equals(k.get("kid"))).findFirst()
                .orElseThrow(() -> new AssertionError("no JWK with kid " + kid));
    }

    private static boolean verify(String algorithm, PublicKey key, String[] parts) throws Exception {
        Signature signature = Signature.getInstance(algorithm);
        signature.initVerify(key);
        signature.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        return signature.verify(Base64.getUrlDecoder().decode(parts[2]));
    }

    private static JsonObject decode(String part) {
        return new JsonObject(new String(Base64.getUrlDecoder().decode(part), StandardCharsets.UTF_8));
    }

    private static BigInteger unsigned(String base64Url) {
        return new BigInteger(1, Base64.getUrlDecoder().decode(base64Url));
    }
}
