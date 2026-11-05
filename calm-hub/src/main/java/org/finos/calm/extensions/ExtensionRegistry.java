package org.finos.calm.extensions;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.Config;
import org.finos.calm.config.ExtensionsConfig;
import org.finos.calm.domain.extensions.ExtensionManifest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Loads the extension manifests and their operator settings at start up (ADR 0012). A bad manifest
 * or setting stops Hub, so that the operator sees it at deploy time. With no
 * {@code calm.extensions.dir} and no built-in manifests, there are no extensions.
 */
@ApplicationScoped
public class ExtensionRegistry {

    private static final Logger LOG = LoggerFactory.getLogger(ExtensionRegistry.class);
    private static final Set<String> URL_SCHEMES = Set.of("http", "https");

    private final ExtensionsConfig config;
    private final Config properties;
    private final ClassLoader classLoader;
    private final String builtinBase;
    private volatile List<RegisteredExtension> extensions = List.of();
    private volatile boolean readOnly;

    @Inject
    public ExtensionRegistry(ExtensionsConfig config, Config properties) {
        this(config, properties, ExtensionRegistry.class.getClassLoader(), ExtensionManifestLoader.BUILTIN_BASE);
    }

    ExtensionRegistry(ExtensionsConfig config, Config properties, ClassLoader classLoader, String builtinBase) {
        this.config = config;
        this.properties = properties;
        this.classLoader = classLoader;
        this.builtinBase = builtinBase;
    }

    void onStartup(@Observes StartupEvent event) {
        load();
    }

    void load() {
        // Read at run time, as ReadOnlyRequestFilter does, so that a native image sees CALM_READONLY.
        readOnly = properties.getOptionalValue("calm.readonly", Boolean.class).orElse(false);
        ExtensionManifestLoader loader = new ExtensionManifestLoader();
        List<ExtensionManifest> manifests = new ArrayList<>(loader.loadClasspath(classLoader, builtinBase));
        config.dir().filter(dir -> !dir.isBlank())
                .ifPresent(dir -> manifests.addAll(loader.loadDirectory(Path.of(dir))));

        List<String> errors = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        List<RegisteredExtension> enabled = new ArrayList<>();
        for (ExtensionManifest manifest : manifests) {
            String id = manifest.id();
            if (!ids.add(id)) {
                errors.add("extension id '" + id + "' is declared by more than one manifest");
                continue;
            }
            Optional<Boolean> isEnabled = booleanSetting(id, "enabled", errors);
            Optional<Integer> order = intSetting(id, "order", errors);
            Optional<URI> backendUrl = urlSetting(id, "backend-url", errors);
            boolean allowHttp = booleanSetting(id, "allow-http", errors).orElse(false);
            ExtensionLimits limits = limits(id, errors);
            if (!isEnabled.orElse(true)) {
                LOG.info("Extension {} is disabled", id);
                continue;
            }
            if (!manifest.routes().isEmpty() && backendUrl.isEmpty()) {
                errors.add(key(id, "backend-url") + " must be set, because extension '" + id + "' is enabled and has routes");
            }
            backendUrl.filter(url -> "http".equalsIgnoreCase(url.getScheme()) && !allowHttp && !isLoopback(url.getHost()))
                    .ifPresent(url -> errors.add(key(id, "backend-url") + " must use https. Plain http is allowed only "
                            + "for a loopback host, or with " + key(id, "allow-http") + "=true"));
            enabled.add(new RegisteredExtension(manifest, order.orElse(0), backendUrl, limits));
        }
        if (!errors.isEmpty()) {
            throw new IllegalStateException("Invalid calm.extensions configuration: " + String.join("; ", errors));
        }
        enabled.sort(Comparator.comparingInt(RegisteredExtension::order).thenComparing(RegisteredExtension::id));
        extensions = List.copyOf(enabled);
        if (!extensions.isEmpty()) {
            LOG.info("Enabled extensions: {}", extensions.stream().map(RegisteredExtension::id).toList());
        }
    }

    /** The enabled extensions in order, with the settings that only Hub may see. */
    public List<RegisteredExtension> enabled() {
        return extensions;
    }

    public Optional<RegisteredExtension> find(String id) {
        return extensions.stream().filter(e -> e.id().equals(id)).findFirst();
    }

    /**
     * The enabled manifests that this Hub can run, in order. A read-only Hub leaves out each write
     * route that is not {@code readOnly}, and the commands and contributions that use it (ADR 0011).
     */
    public List<ExtensionManifest> available() {
        return extensions.stream()
                .map(RegisteredExtension::manifest)
                .map(m -> readOnly ? m.withRoutes(r -> "GET".equals(r.method()) || r.readOnly()) : m)
                .toList();
    }

    private Optional<String> setting(String id, String name) {
        // The quoted form is the documented one; the plain form is accepted because ids have no dots.
        return properties.getOptionalValue(key(id, name), String.class)
                .or(() -> properties.getOptionalValue("calm.extensions." + id + "." + name, String.class))
                .map(String::trim);
    }

    private Optional<Boolean> booleanSetting(String id, String name, List<String> errors) {
        return setting(id, name).flatMap(value -> {
            if (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false")) {
                return Optional.of(Boolean.parseBoolean(value));
            }
            errors.add(key(id, name) + " must be true or false, but was '" + value + "'");
            return Optional.empty();
        });
    }

    private Optional<Integer> intSetting(String id, String name, List<String> errors) {
        return setting(id, name).flatMap(value -> {
            try {
                return Optional.of(Integer.parseInt(value));
            } catch (NumberFormatException e) {
                errors.add(key(id, name) + " must be an integer, but was '" + value + "'");
                return Optional.empty();
            }
        });
    }

    private Optional<URI> urlSetting(String id, String name, List<String> errors) {
        return setting(id, name).flatMap(value -> {
            try {
                URI uri = new URI(value);
                if (uri.getScheme() != null && URL_SCHEMES.contains(uri.getScheme().toLowerCase())
                        && uri.getHost() != null && uri.getRawUserInfo() == null
                        && uri.getRawQuery() == null && uri.getRawFragment() == null) {
                    return Optional.of(uri);
                }
            } catch (URISyntaxException e) {
                // Reported below.
            }
            errors.add(key(id, name) + " must be an absolute http or https URL with no user info, query or fragment");
            return Optional.empty();
        });
    }

    private ExtensionLimits limits(String id, List<String> errors) {
        ExtensionsConfig.Http defaults = config.http();
        return new ExtensionLimits(
                Duration.ofSeconds(positiveSetting(id, "connect-timeout-seconds", defaults.connectTimeoutSeconds(), errors)),
                Duration.ofSeconds(positiveSetting(id, "request-timeout-seconds", defaults.requestTimeoutSeconds(), errors)),
                positiveSetting(id, "max-request-bytes", defaults.maxRequestBytes(), errors),
                positiveSetting(id, "max-response-bytes", defaults.maxResponseBytes(), errors));
    }

    private int positiveSetting(String id, String name, int fallback, List<String> errors) {
        int value = intSetting(id, name, errors).orElse(fallback);
        if (value < 1) {
            errors.add(key(id, name) + " must be at least 1, but was " + value);
        }
        return value;
    }

    /** Only literal loopback names, so that no DNS answer can make a host count as loopback. */
    private static boolean isLoopback(String host) {
        String name = host.toLowerCase(Locale.ROOT);
        return name.equals("localhost") || name.equals("[::1]") || name.matches("127(\\.\\d{1,3}){3}");
    }

    private static String key(String id, String name) {
        return "calm.extensions.\"" + id + "\"." + name;
    }
}
