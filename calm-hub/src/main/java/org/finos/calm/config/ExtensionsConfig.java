package org.finos.calm.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import io.smallrye.config.WithParentName;

import java.util.Map;
import java.util.Optional;

/**
 * Static settings for CALM Hub extensions (ADR 0012).
 */
@ConfigMapping(prefix = "calm.extensions")
public interface ExtensionsConfig {

    /** Holds one folder for each extension, with an {@code extension.json} in it. */
    Optional<String> dir();

    /**
     * The settings of each extension, {@code calm.extensions."<id>".*}. This map only declares the
     * keys, so that SmallRye does not reject them as unknown. {@code ExtensionRegistry} reads them by
     * full name, because SmallRye cannot map an environment variable to a map key with a dash.
     */
    @WithParentName
    Map<String, Extension> extensions();

    /** For the proxy (not built yet): the key that signs the identity that Hub sends to an extension. */
    Identity identity();

    /** For the proxy (not built yet): limits on each call to an extension backend. */
    Http http();

    /** Strings, so that {@code ExtensionRegistry} does the checks and names the bad setting. */
    interface Extension {
        Optional<String> enabled();

        Optional<String> order();

        Optional<String> backendUrl();
    }

    interface Identity {
        /** A PKCS#8 PEM file with the RSA private key. */
        Optional<String> privateKeyLocation();
    }

    interface Http {
        @WithDefault("5")
        int connectTimeoutSeconds();

        @WithDefault("10")
        int requestTimeoutSeconds();

        @WithDefault("1048576")
        int maxResponseBytes();
    }
}
