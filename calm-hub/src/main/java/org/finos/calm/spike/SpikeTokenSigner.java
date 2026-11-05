package org.finos.calm.spike;

import io.quarkus.arc.properties.IfBuildProperty;
import io.smallrye.jwt.algorithm.SignatureAlgorithm;
import io.smallrye.jwt.build.Jwt;
import io.smallrye.jwt.util.KeyUtils;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Spike for ADR 0010: signs the ADR's first-cut claim set with RS256 or ES256 and exposes the
 * public half as a JWK. The key pair is made at start up and goes through PEM, so the
 * operator-supplied-PEM path ({@link KeyUtils#decodePrivateKey}) is the one that signs.
 */
@ApplicationScoped
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeTokenSigner {

    public static final String TYPE = "calm-ext+jwt";

    private final Map<SignatureAlgorithm, SigningKey> keys = new LinkedHashMap<>();

    record SigningKey(PrivateKey privateKey, Map<String, String> jwk) {
    }

    public SpikeTokenSigner() throws GeneralSecurityException {
        keys.put(SignatureAlgorithm.RS256, rsaKey());
        keys.put(SignatureAlgorithm.ES256, ecKey());
    }

    public String sign(SignatureAlgorithm algorithm, String subject, String extensionId) {
        SigningKey key = keys.get(algorithm);
        if (key == null) {
            throw new IllegalArgumentException("Unsupported algorithm " + algorithm);
        }
        long now = Instant.now().getEpochSecond();
        return Jwt.issuer("https://hub.example.test")
                .subject(subject)
                .audience(extensionId)
                .issuedAt(now)
                .expiresAt(now + 60)
                .claim("jti", UUID.randomUUID().toString())
                .claim("auth", "proxy")
                .claim("hubApi", 1)
                .claim("route", "evaluate")
                .claim("scope", "read")
                .claim("ns", "finos")
                .claim("htm", "POST")
                .claim("htp", "/evaluate?a=1&b=2")
                .jws()
                .header("typ", TYPE)
                .keyId(key.jwk().get("kid"))
                .algorithm(algorithm)
                .sign(key.privateKey());
    }

    public List<Map<String, String>> jwks() {
        return keys.values().stream().map(SigningKey::jwk).toList();
    }

    private static SigningKey rsaKey() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        RSAPublicKey pub = (RSAPublicKey) pair.getPublic();
        String n = base64Url(pub.getModulus());
        String e = base64Url(pub.getPublicExponent());
        String kid = thumbprint("{\"e\":\"" + e + "\",\"kty\":\"RSA\",\"n\":\"" + n + "\"}");
        PrivateKey decoded = fromPem(pair.getPrivate(), SignatureAlgorithm.RS256);
        return new SigningKey(decoded, Map.of("kty", "RSA", "use", "sig", "alg", "RS256", "kid", kid, "n", n, "e", e));
    }

    private static SigningKey ecKey() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = generator.generateKeyPair();
        ECPublicKey pub = (ECPublicKey) pair.getPublic();
        String x = base64Url(pub.getW().getAffineX(), 32);
        String y = base64Url(pub.getW().getAffineY(), 32);
        String kid = thumbprint("{\"crv\":\"P-256\",\"kty\":\"EC\",\"x\":\"" + x + "\",\"y\":\"" + y + "\"}");
        PrivateKey decoded = fromPem(pair.getPrivate(), SignatureAlgorithm.ES256);
        return new SigningKey(decoded, Map.of("kty", "EC", "use", "sig", "alg", "ES256", "crv", "P-256", "kid", kid, "x", x, "y", y));
    }

    private static PrivateKey fromPem(PrivateKey key, SignatureAlgorithm algorithm) throws GeneralSecurityException {
        String pem = "-----BEGIN PRIVATE KEY-----\n"
                + Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.US_ASCII)).encodeToString(key.getEncoded())
                + "\n-----END PRIVATE KEY-----\n";
        return KeyUtils.decodePrivateKey(pem, algorithm);
    }

    // RFC 7638: members in lexicographic order, no whitespace.
    private static String thumbprint(String canonicalJwk) throws GeneralSecurityException {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonicalJwk.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    }

    private static String base64Url(BigInteger value) {
        byte[] bytes = value.toByteArray();
        if (bytes.length > 1 && bytes[0] == 0) {
            bytes = Arrays.copyOfRange(bytes, 1, bytes.length);
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // EC coordinates are fixed-length (RFC 7518 6.2.1.2): left-pad to the curve size.
    private static String base64Url(BigInteger value, int length) {
        byte[] raw = value.toByteArray();
        byte[] out = new byte[length];
        int copy = Math.min(raw.length, length);
        System.arraycopy(raw, raw.length - copy, out, length - copy, copy);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(out);
    }
}
