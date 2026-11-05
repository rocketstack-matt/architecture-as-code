# Extensions spike (I0)

Spike code for the CALM Hub extensions build (finos/architecture-as-code#3396). **Not for merge.**
It answers five questions that ADRs 0010, 0014 and 0016 leave open. The findings report has the
answers.

| Where | What |
|---|---|
| `src/main/java/org/finos/calm/spike/` | Spike beans and the `/spike/*` endpoints. They are built only with `calm.spike.enabled=true` (`@IfBuildProperty`), so a normal build does not have them |
| `src/test/java/org/finos/calm/spike/TestSpike*Should` | Black-box HTTP tests, one class for each question |
| `src/test/java/org/finos/calm/spike/Spike*Integration` | The same tests as `@QuarkusIntegrationTest`, against the packaged jar or the native image |
| `TestSpikeJsonSchemaSuite` | Scores vertx-json-schema on the official JSON-Schema-Test-Suite. Runs only with `-Dspike.jsts.dir` |

**Never deploy a build with `calm.spike.enabled=true`:** `SpikeHeaderAuthMechanism` trusts a
request header for the user.

`SpikeProfile` runs Hub in standalone (Nitrite) mode with no Dev Services, so the tests do not
need Docker. `SpikeHeaderAuthMechanism` takes the user from the `X-Spike-User` header.
`SpikeUpstream` is a fake SSE backend.

| Test class | Question |
|---|---|
| `TestSpikeJwtShould` | 1. RS256 and ES256 signing with `smallrye-jwt-build` |
| `TestSpikeJsonSchemaShould`, `TestSpikeJsonSchemaSuite` | 2. JSON Schema 2020-12 with `vertx-json-schema` |
| `TestSpikeMcpShould` | 3. MCP tools from `ToolManager`, and the caller's `SecurityIdentity` |
| `TestSpikeCdiDecoratorShould` | 4. CDI `@Decorator` on a producer-method bean |
| `TestSpikeSseShould` | 5. SSE relay with a bounded number of streams, an idle timeout and a max duration |

## Run

From the repository root:

```bash
# JVM mode. The test profile turns the spike on.
./mvnw -pl calm-hub -Pserver-only test -Dtest='TestSpike*' -Djacoco.skip=true

# Against the packaged jar. calm.spike.enabled must be set at build time.
# Failsafe is called directly: the `integration` profile adds Docker-based test resources to every test.
./mvnw -pl calm-hub -Pserver-only package \
  org.apache.maven.plugins:maven-failsafe-plugin:3.5.6:integration-test \
  org.apache.maven.plugins:maven-failsafe-plugin:3.5.6:verify \
  -Dcalm.spike.enabled=true -Dtest='TestSpike*Should' -Dit.test='Spike*Integration' \
  -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true

# JSON-Schema-Test-Suite score (clone it into sandbox/ first)
git clone --depth 1 https://github.com/json-schema-org/JSON-Schema-Test-Suite sandbox/jsts
./mvnw -pl calm-hub -Pserver-only test -Dtest=TestSpikeJsonSchemaSuite -Dspike.jsts.dir=$PWD/sandbox/jsts
```

## Native

This was not run in the spike sandbox: it has no Docker daemon and cannot download GraalVM or
Mandrel. To run it, you need Docker (or Podman) and access to `quay.io` for the Quarkus builder
image, or a local Mandrel for Java 21. Add `-Pnative` and a container build to the
packaged-jar command above:

```bash
./mvnw -pl calm-hub -Pserver-only,native package \
  org.apache.maven.plugins:maven-failsafe-plugin:3.5.6:integration-test \
  org.apache.maven.plugins:maven-failsafe-plugin:3.5.6:verify \
  -Dquarkus.native.container-build=true \
  -Dquarkus.native.resources.includes='json-schema.org/draft/2020-12/**' \
  -Dcalm.spike.enabled=true -Dtest='TestSpike*Should' -Dit.test='Spike*Integration' \
  -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true
```

The meta-schema check needs `quarkus.native.resources.includes`: vertx-json-schema reads the
2020-12 meta-schemas from classpath resources, which a native image leaves out by default.
