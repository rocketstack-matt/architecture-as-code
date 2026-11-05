package org.finos.calm.extensions;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.Config;
import org.finos.calm.domain.extensions.ExtensionManifest;
import org.finos.calm.security.ProxyAuthenticationMechanism;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Calls an extension route for a caller (ADR 0011). The REST proxy and the MCP tools both use this
 * service, so that the same rules apply to each call. Hub builds a new request: no header from the
 * caller reaches the backend except the allow-listed ones, and the caller's token never does. The
 * reply is buffered; streaming is not supported yet.
 */
@ApplicationScoped
public class ExtensionProxyService {

    private static final Logger LOG = LoggerFactory.getLogger(ExtensionProxyService.class);
    private static final Set<String> REPLY_TYPES = Set.of("application/json", "text/event-stream", "text/plain");
    private static final List<String> REPLY_HEADERS = List.of("Content-Type", "Cache-Control", "ETag");

    private final ExtensionRegistry registry;
    private final ExtensionIdentitySigner signer;
    private final String authMode;
    private final Map<String, HttpClient> clients = new ConcurrentHashMap<>();

    @Inject
    public ExtensionProxyService(ExtensionRegistry registry, ExtensionIdentitySigner signer, Config properties,
                                 Instance<ProxyAuthenticationMechanism> proxyAuthentication) {
        this(registry, signer, authMode(properties, proxyAuthentication.isResolvable()));
    }

    ExtensionProxyService(ExtensionRegistry registry, ExtensionIdentitySigner signer, String authMode) {
        this.registry = registry;
        this.signer = signer;
        this.authMode = authMode;
    }

    /** The {@code auth} claim: how Hub knows who the caller is. */
    static String authMode(Config properties, boolean proxyAuthentication) {
        if (!properties.getOptionalValue("calm.auth.enabled", Boolean.class).orElse(false)) {
            return "none";
        }
        return proxyAuthentication ? "proxy" : "oidc";
    }

    /** Throws {@link ExtensionProxyException} when Hub refuses the call or the backend fails. */
    public ExtensionProxyResponse call(SecurityIdentity identity, ExtensionProxyRequest request) {
        RegisteredExtension extension = registry.find(request.extensionId())
                .orElseThrow(() -> new ExtensionProxyException(404, "There is no such extension"));
        URI backend = extension.backendUrl()
                .orElseThrow(() -> new ExtensionProxyException(404, "The extension has no such route"));
        String method = request.method().toUpperCase(Locale.ROOT);
        String path = ExtensionPaths.checkPath(request.path());
        ExtensionRouteMatcher.RouteMatch match = ExtensionRouteMatcher.match(extension.manifest(), method, path);
        ExtensionManifest.Route route = match.route();

        String query = ExtensionPaths.canonicalQuery(request.rawQuery());
        String pathAndQuery = query.isEmpty() ? path : path + "?" + query;
        URI target = ExtensionPaths.resolve(backend, pathAndQuery);
        ExtensionLimits limits = extension.limits();
        byte[] body = readBody(request.body(), limits.maxRequestBytes());

        String jti = UUID.randomUUID().toString();
        String assertion = signer.sign(new ExtensionAssertion(identity.getPrincipal().getName(), extension.id(), jti,
                authMode, extension.manifest().hubApi(), route.id(), route.scope(), match.parameters().get("namespace"),
                method, pathAndQuery));
        HttpRequest outbound = outboundRequest(request, method, target, body, limits, assertion);
        return send(extension, route, outbound);
    }

    private static HttpRequest outboundRequest(ExtensionProxyRequest request, String method, URI target, byte[] body,
                                               ExtensionLimits limits, String assertion) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(target)
                    .timeout(limits.requestTimeout())
                    .header(ExtensionIdentitySigner.HEADER, assertion)
                    .method(method, body.length == 0
                            ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofByteArray(body));
            copyHeader(builder, "Content-Type", request.contentType());
            copyHeader(builder, "Accept", request.accept());
            copyHeader(builder, "Accept-Language", request.acceptLanguage());
            return builder.build();
        } catch (IllegalArgumentException e) {
            throw new ExtensionProxyException(400, "The request has a header value that is not allowed");
        }
    }

    private static void copyHeader(HttpRequest.Builder builder, String name, String value) {
        if (value != null && !value.isBlank()) {
            builder.header(name, value);
        }
    }

    private ExtensionProxyResponse send(RegisteredExtension extension, ExtensionManifest.Route route, HttpRequest outbound) {
        ExtensionLimits limits = extension.limits();
        HttpResponse.BodyHandler<byte[]> capped = info -> new CappedBodySubscriber(limits.maxResponseBytes());
        CompletableFuture<HttpResponse<byte[]>> future = client(extension).sendAsync(outbound, capped);
        HttpResponse<byte[]> response;
        try {
            // The request timeout covers the reply headers only, so the whole call has its own limit.
            response = future.get(limits.requestTimeout().toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw timeout(extension, route);
        } catch (ExecutionException e) {
            if (isTimeout(e.getCause())) {
                throw timeout(extension, route);
            }
            LOG.warn("Extension {} route {} failed: {}", extension.id(), route.id(), e.getCause().toString());
            throw badGateway();
        } catch (InterruptedException e) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw badGateway();
        }
        return reply(extension, route, response);
    }

    private static ExtensionProxyResponse reply(RegisteredExtension extension, ExtensionManifest.Route route,
                                                HttpResponse<byte[]> response) {
        int status = response.statusCode();
        // A 401 or 407 would start a login in the caller; a redirect cannot be followed with no Location.
        boolean passOn = (status >= 200 && status < 300) || (status >= 400 && status < 500 && status != 401 && status != 407);
        String contentType = response.headers().firstValue("Content-Type").orElse(null);
        boolean typeAllowed = contentType == null ? response.body().length == 0 : REPLY_TYPES.contains(mediaType(contentType));
        if (!passOn || !typeAllowed) {
            LOG.warn("Extension {} route {} returned status {} with a content type that is {}allowed", extension.id(),
                    route.id(), status, typeAllowed ? "" : "not ");
            throw badGateway();
        }
        Map<String, String> headers = new LinkedHashMap<>();
        for (String name : REPLY_HEADERS) {
            response.headers().firstValue(name).ifPresent(value -> headers.put(name, value));
        }
        return new ExtensionProxyResponse(status, headers, response.body());
    }

    private HttpClient client(RegisteredExtension extension) {
        return clients.computeIfAbsent(extension.id(), id -> HttpClient.newBuilder()
                .proxy(ProxySelector.getDefault())
                .connectTimeout(extension.limits().connectTimeout())
                .followRedirects(HttpClient.Redirect.NEVER)
                // No h2c upgrade on a plain http backend; https still negotiates its version.
                .version(HttpClient.Version.HTTP_1_1)
                .build());
    }

    private static byte[] readBody(InputStream body, int maxBytes) {
        if (body == null) {
            return new byte[0];
        }
        try {
            byte[] bytes = body.readNBytes(maxBytes + 1);
            if (bytes.length > maxBytes) {
                throw new ExtensionProxyException(413, "The request body is too large for this extension");
            }
            return bytes;
        } catch (IOException e) {
            throw new ExtensionProxyException(400, "The request body cannot be read");
        }
    }

    private static String mediaType(String contentType) {
        int semicolon = contentType.indexOf(';');
        return (semicolon < 0 ? contentType : contentType.substring(0, semicolon)).trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isTimeout(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof HttpTimeoutException) {
                return true;
            }
        }
        return false;
    }

    private static ExtensionProxyException timeout(RegisteredExtension extension, ExtensionManifest.Route route) {
        LOG.warn("Extension {} route {} did not reply in time", extension.id(), route.id());
        return new ExtensionProxyException(504, "The extension did not reply in time");
    }

    private static ExtensionProxyException badGateway() {
        return new ExtensionProxyException(502, "The extension failed");
    }

    /** Fails the reply as soon as it is larger than the cap, so that Hub never buffers more. */
    static final class CappedBodySubscriber implements HttpResponse.BodySubscriber<byte[]> {

        private final int maxBytes;
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        private Flow.Subscription subscription;

        CappedBodySubscriber(int maxBytes) {
            this.maxBytes = maxBytes;
        }

        @Override
        public CompletionStage<byte[]> getBody() {
            return result;
        }

        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            subscription.request(Long.MAX_VALUE);
        }

        @Override
        public void onNext(List<ByteBuffer> items) {
            if (result.isDone()) {
                return;
            }
            for (ByteBuffer item : items) {
                if (buffer.size() + item.remaining() > maxBytes) {
                    subscription.cancel();
                    result.completeExceptionally(new IOException("The reply is larger than " + maxBytes + " bytes"));
                    return;
                }
                byte[] bytes = new byte[item.remaining()];
                item.get(bytes);
                buffer.write(bytes, 0, bytes.length);
            }
        }

        @Override
        public void onError(Throwable error) {
            result.completeExceptionally(error);
        }

        @Override
        public void onComplete() {
            result.complete(buffer.toByteArray());
        }
    }
}
