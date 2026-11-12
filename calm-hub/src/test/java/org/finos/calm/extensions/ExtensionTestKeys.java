package org.finos.calm.extensions;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.AlgorithmParameterSpec;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.RSAKeyGenParameterSpec;
import java.util.Base64;

/** Key pairs written as PEM files, so that no test key is committed. */
public final class ExtensionTestKeys {

    /** The PEM files of one key pair. */
    public record KeyFiles(KeyPair pair, Path privateKey, Path publicKey) {}

    private ExtensionTestKeys() {
    }

    public static KeyFiles rsa(Path dir, String name) {
        return write(dir, name, generate("RSA", new RSAKeyGenParameterSpec(2048, RSAKeyGenParameterSpec.F4)));
    }

    public static KeyFiles rsa(Path dir, String name, int bits) {
        return write(dir, name, generate("RSA", new RSAKeyGenParameterSpec(bits, RSAKeyGenParameterSpec.F4)));
    }

    public static KeyFiles ec(Path dir, String name, String curve) {
        return write(dir, name, generate("EC", new ECGenParameterSpec(curve)));
    }

    /** RSA key files in a new temporary folder, for a Quarkus test profile. */
    public static KeyFiles rsaInTempDir() {
        try {
            return rsa(Files.createTempDirectory("calm-hub-keys"), "hub");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static KeyPair generate(String algorithm, AlgorithmParameterSpec spec) {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance(algorithm);
            generator.initialize(spec);
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static KeyFiles write(Path dir, String name, KeyPair pair) {
        try {
            Path privateKey = Files.writeString(dir.resolve(name + "-private.pem"),
                    pem("PRIVATE KEY", pair.getPrivate().getEncoded()));
            Path publicKey = Files.writeString(dir.resolve(name + "-public.pem"),
                    pem("PUBLIC KEY", pair.getPublic().getEncoded()));
            return new KeyFiles(pair, privateKey, publicKey);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static String pem(String label, byte[] der) {
        return "-----BEGIN " + label + "-----\n"
                + Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(der)
                + "\n-----END " + label + "-----\n";
    }
}
