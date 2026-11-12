## P01: `fix(calm-hub): refuse MCP write tools on a read-only Hub`

Commit `b27846a5`. From `d4c59cfc` (`cfdca7c0`, `1636dc37`, `783fa02a`, `c9170811`).

Files: `ReadOnlyHubGuard.java`, `ReadOnlyHubGuardInterceptor.java`, `@ReadOnlyHubGuard` on the 11 `*Tools` classes that exist on `main` (with `DecoratorTools`), the MCP paragraph in `ReadOnlyRequestFilter`, `McpTestClient`, `TestMcpToolsReadOnlyShould`, `TestReadOnlyHubGuardInterceptorShould`, `calm-hub/AGENTS.md` (MCP bullet and the Read-Only Deployment Mode line), `docs/docs/calm-hub/index.md` (one paragraph).

- `McpTestClient` came out of `TestExtensionToolsMcpShould` (I9). P01 adds it, and P14 uses it.
- The docs leave out "and so do the extension commands that a read-only Hub can run". P14 adds it.
- The AGENTS.md Read-Only line now says "every JAX-RS path" and "MCP refuses writes itself". P09 adds the proxy exception.

Java to compile: `mcp/tools/{Adr,Architecture,Control,Decorator,Domain,Interface,Namespace,Pattern,Search,Standard,Timeline}Tools.java`, `mcp/tools/ReadOnlyHubGuard.java`, `mcp/tools/ReadOnlyHubGuardInterceptor.java`, `security/ReadOnlyRequestFilter.java`; tests `mcp/tools/McpTestClient.java`, `TestMcpToolsReadOnlyShould.java`, `TestReadOnlyHubGuardInterceptorShould.java`.

<details><summary>Draft PR body</summary>

```markdown
## Description
Part of #3396 (PR 1 of a stack).

MCP is served by Vert.x routes, not JAX-RS, so `ReadOnlyRequestFilter` never sees it. A read-only Hub ran the MCP write tools. This PR puts `@ReadOnlyHubGuard` on each MCP tool class. On a read-only Hub, its interceptor refuses each tool that needs more than a read scope, and the tool returns an error. The check runs before the permission check, so a caller without the scope also gets the read-only error.

`TestMcpToolsReadOnlyShould` calls every MCP tool bean, so a new tool class that changes data and has no guard fails the test.

## Type of Change
- [x] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [ ] 🔧 Chore (maintenance, dependencies, CI, etc.)

## Affected Components
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [x] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [ ] CALM Hub UI (`calm-hub-ui/`)
- [ ] CALM Lab (`calm-lab/`)
- [ ] CALM Models (`calm-models/`)
- [ ] CALM Server (`calm-server/`)
- [ ] CALM Widgets (`calm-widgets/`)
- [ ] CALMGuard (`calm-guard/`)
- [x] Documentation (`docs/`)
- [ ] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [ ] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`fix(calm-hub): refuse MCP write tools on a read-only Hub`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

`TestReadOnlyHubGuardInterceptorShould` (unit) and `TestMcpToolsReadOnlyShould` (`@QuarkusTest`: every write tool bean, and `createDecorator` called over `/mcp`).

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```
</details>

## P02: `chore(calm-hub): test against MongoDB 5.0, the oldest supported version`

Commit `7fd575f9`. From `d4c59cfc` (`1750a6f3`, and the image property of `e4d33e58`).

Files: `pom.xml` (the `calm.it.mongo-image` property, default `mongo:5.0`, passed to failsafe), `EndToEndResource` (reads the property; `GLIBC_TUNABLES` for newer images), `MongoPatternImplementationStore` (comment), `developer-guide.md` (MongoDB tests line), `docs/docs/calm-hub/index.md` (MongoDB 5.0+).

Java to compile: `integration-test/.../EndToEndResource.java`, `store/mongo/MongoPatternImplementationStore.java` (comment only).

<details><summary>Draft PR body</summary>

```markdown
## Description
Part of #3396 (PR 2 of a stack).

MongoDB 4.4 refuses a `$`-prefixed key in an update, so it cannot store a decorator that has a `$schema`. CALM Hub's oldest supported MongoDB is now 5.0, and the integration suite runs on `mongo:5.0`. The `calm.it.mongo-image` property selects another image, for example `-Dcalm.it.mongo-image=mongo:8`, because deploy uses `mongo:latest`. The docs now give 5.0 as the oldest version.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [x] 🔧 Chore (maintenance, dependencies, CI, etc.)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] Documentation (`docs/`)
(other boxes unchecked)

## Commit Message Format ✅
`chore(calm-hub): test against MongoDB 5.0, the oldest supported version`

## Testing
- [x] I have tested my changes locally
- [ ] I have added/updated unit tests
- [x] All existing tests pass

`../mvnw -P integration verify` on `mongo:5.0`, and with `-Dcalm.it.mongo-image=mongo:8`.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [ ] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```
</details>

## P03: `test(calm-hub): run the Nitrite integration suites on Nitrite`

Commit `ea3a720e`. From `013c8390`. `test` is in the `type-enum` of `commitlint.config.js`, so the title stays.

Files: `NitriteEndToEndResource.java` only.

Java to compile: `integration-test/.../NitriteEndToEndResource.java`.

Risk: P03 makes the Nitrite suites run on Nitrite for the first time since #3116. A Nitrite suite that only passed on Mongo now fails at P03. The runner shows this.

<details><summary>Draft PR body</summary>

```markdown
## Description
Part of #3396 (PR 3 of a stack).

`NitriteEndToEndResource` gave its config only as the returned map. That map does not reach `@ConfigProperty` or `@LookupIfProperty` (quarkusio/quarkus#52919), so since #3116 the Nitrite integration suites ran on MongoDB. The resource now also sets its config as system properties, as `EndToEndResource` does, and clears them when it stops.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [x] ✅ Test additions or updates
- [ ] 🔧 Chore (maintenance, dependencies, CI, etc.)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
(other boxes unchecked)

## Commit Message Format ✅
`test(calm-hub): run the Nitrite integration suites on Nitrite`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

`../mvnw -P integration verify`. The Nitrite suites now log the standalone (Nitrite) stores.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [ ] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```
</details>

## P04: `feat(calm-hub-ui): add a diagram tab registry and a generic Decorators view`

Commit `1367acbd`. From I1 (`7831ffe0`) with the I1 fixes: `25b8d831` (one polled list, hook part only), `1adc80dd`, `37621604`, `fb1682da`, `eece8e08`, `711a8115`, `cf3bb125`, `dfe8b0fc`, `2e39c987` (card keys only), `3c028632` (`Object.hasOwn` only), `37defd25`, `15648244` (environment pill).

Files (38): `decorator-renderer/*` (with `decoratorKeys`, `writable`), `DecoratorsPanel`, `useArchitectureDecorators` (+test), `tabs/diagramTabRegistry` (+test), `tabs/diagramTabs.tsx`, `DecoratorsSection` (+test), `DecoratorsContext`, `DiagramSection` (+test), `Hub` (+test), `calm-service` (+test), `Drawer` (+test), `NodeDetails`, `RelationshipDetails`, `decorator-contracts`, `visualizer-contracts`, `EnvironmentPill` (+test), `calm-hub-ui/AGENTS.md`, `working-with-calm/calm-hub.md`, `calm-hub/index.md` (pill line).

How it differs from the I1 merge and from the final form:

- The Deployments tab still exists at P04 (I4 removes it). The poll runs on the diagram, the Deployments tab, the Decorators tab and while the details drawer is open. The diagram gets only the `deployment` decorators of the one polled list.
- `calm-service`: `fetchDecoratorsForTarget(namespace, target, type?)` replaces `fetchControlEvaluationDecorators`, as in the final form, and `Drawer` calls it with `'control-evaluation'`. `resolveArchitectureVersionTarget` now rejects when the mappings request fails (needed to tell "unmapped" from "Hub down"). `fetchDeploymentDecoratorsForArchitecture` stays until P07 and still returns `[]` on that failure (new test).
- Left to P07: the containment map in `DecoratorsContext` (`95b7d03e`, `170e8998`) and the "All decorators" heading (`2e39c987`). Both exist because the badges fold containment decorators.

Java: none.

<details><summary>Draft PR body</summary>

```markdown
## Description
Part of #3396 (PR 4 of a stack).

The diagram section's tabs now come from one registry (`DIAGRAM_TABS`), so a new tab is one entry. An unknown `?tab=` value opens the diagram and is dropped from the URL. A hidden tab, such as Used by before the pattern summary loads, is kept.

A new **Decorators** tab lists every decorator of the architecture version, of any type, with a type filter in the URL (`?tab=decorators&type=deployment`). A card shows the type, `applies-to`, the times when Hub returns them, and `data` with links, dates, lists, tables and collapsible values. Its JSON view shows the decorator as a write takes it, so it can be copied into a `PUT`. The details drawer lists the decorators of the selected node or relationship.

`DiagramSection` polls the decorators with one request every 5 s, only while the diagram, a decorator tab or the details drawer shows them. After three failures it backs off to 30 s. It tells an architecture that Hub has no mapping for from a Hub that does not answer.

Also: a tap on a truncated environment pill shows the full name, because a touch screen has no hover.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [x] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [ ] 🔧 Chore (maintenance, dependencies, CI, etc.)

## Affected Components
- [x] CALM Hub UI (`calm-hub-ui/`)
- [x] Documentation (`docs/`)
(other boxes unchecked)

## Commit Message Format ✅
`feat(calm-hub-ui): add a diagram tab registry and a generic Decorators view`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

calm-hub-ui: lint, `vitest run` (2375 tests), build. Docs build.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```
</details>

## P05: `feat(calm-hub): reserve decorator types, check decorator schemas and keep history`

Commit `a5d2ea15`. From I3 (`45ab0da4`) with the decorator fixes of `04309b01`, `d4c59cfc`, `176be720`, `ca319463` and `c179940d`, minus I12 (F1).

How I cut it: I took the final form of each I3 file, then reverse-applied the I12 merge (`67aaeeb9`) with a three-way merge and resolved each conflict by hand. Then I compared each file with `8f51089b`: the only differences are I12 code (times, `HubOwnedDecoratorFieldException`, `supersededDateTime`, `withTimestamps`) and the imports and javadoc that go with them.

Not in P05, by F1: the refusal of Hub-owned fields in a body (`creationDateTime`, `updateDateTime`, `supersededDateTime`, `supersedes`, `supersededBy`). At P05, a body with a top-level `supersedes` is stored inside the decorator document. The history link is a field of the store entry beside it, so the two do not collide. P19 adds the refusal.

Also by hunk: `pom.xml` (vertx-json-schema once, F3; the standards resource), `application.properties` (native include `decorator-standards`, reserved-types comment), `.gitignore` (decorator-standards index), `calm-hub/AGENTS.md` (audit successor entry), `developer-guide.md` (reserved row), `mcp-and-api.md` (Decorator Write Rules without the times and without "except extension commands"). The `domain_admin` row that `58faf5bc` added to `mcp-and-api.md` is a fix to the existing table. I gave it to P20.

Java to compile (47): main `config/DecoratorConfig`, `domain/{Decorator,DecoratorHistoryEntry,DecoratorSchemaError,SchemaValidationLimits}`, `domain/exception/{DecoratorKeyRefused,DecoratorSchemaValidation,DecoratorSuperseded,DecoratorTooLarge,ReservedDecoratorType}Exception`, `mcp/tools/{DecoratorTools,McpValidationHelper}`, `resources/{CalmResourceErrorResponses,DecoratorResource}`, `security/AuditRequestFilter`, `services/{DecoratorSchemaValidator,DecoratorWriteService}`, `store/DecoratorStore`, `store/github/GitHubDecoratorStore`, `store/mongo/MongoDecoratorStore`, `store/nitrite/NitriteDecoratorStore`, `store/util/{DecoratorHistoryChain,DecoratorJson}`; tests `TestDecoratorSchemaValidationExceptionShould`, `TestDecoratorToolsShould`, `TestMcpValidationHelperShould`, `TestDecoratorResource{,GitHubMode,OpenApi,WriteErrors}Should`, `TestReservedDecoratorResourceShould`, `TestAuditRequestFilterShould`, `TestDecoratorSchemaValidatorShould`, `TestDecoratorWriteServiceShould`, `TestGitHubDecoratorStoreShould`, `MongoDecoratorStoreTest`, `TestMongoDecoratorStoreShould`, `NitriteDecoratorStoreTest`, `TestNitriteDecoratorHistoryShould`, `TestNitriteDecoratorStorePersistenceShould`, `TestNitriteDecoratorStoreShould`, `TestDecoratorHistoryChainShould`, `testutil/LogCapture`; integration tests `IntegrationTestProfile`, `NitriteIntegrationTestProfile`, `MongoDecoratorIntegration`, `NitriteDecoratorIntegration` (timestamp checks removed).

Deliberate differences from ADR 0017 (#3581):

| ADR 0017 | P05 |
|---|---|
| `validation` is reserved for Hub (`system` flag); the operator adds other types | No built-in reserved type, and no `system` flag. Every reservation is `calm.decorators.reserved."<type>".writers`, matched against the principal name |
| With auth off, a type that maps to a service account accepts any writer | No special case: the writer list must name the principal |
| An update of a reserved type is refused with 409; the writer creates a new decorator, which supersedes the current one with the same type, target and data key | A `PUT` stores a successor that supersedes the decorator it names and returns 201 with the new id. No data key. A `PUT` on a superseded decorator gives 409 |
| The schema check goes through the `ArchitectureValidator` (calm-server); 503 when it fails | Hub checks in process with vertx-json-schema against the bundled calm-schema Standards. No 503 path |
| Through the ADR 0016 write seam | Through `DecoratorWriteService`, shared by REST and MCP |
| One document per decorator before reserved types ship (#3639) | One document per namespace, as now. At 16 MB a write gives 413; the docs say how to recover |
| A list returns history only when asked | `GET .../decorators/{id}/history` and the `getDecoratorHistory` tool |

<details><summary>Draft PR body</summary>

```markdown
## Description
Part of #3396 (PR 5 of a stack).

**Reserved types.** An operator can reserve a decorator type for named principals (`calm.decorators.reserved."<type>".writers`). Any other caller gets 403 from REST and a tool error from MCP. Hub logs the reserved types at startup. A reserved type is append-only: an update stores a new decorator that supersedes the old one, returns 201 with the new id and a `Location`, and keeps the old one. `GET .../decorators/{id}/history` and the MCP tool `getDecoratorHistory` return the history, current first. Lists return only current decorators. A superseding `PUT` gives an `UPDATE` and a `CREATE` audit entry.

**Write rules.** REST and MCP writes now go through `DecoratorWriteService`:

| Rule | Status |
|---|---|
| Body over 1 MiB of UTF-8 | 413 |
| `$schema`, `unique-id`, `type` not a string, or `target`, `target-type`, `applies-to` not an array of strings | 400 (fixed message; it does not echo the body) |
| Reserved type, caller not a writer | 403 |
| The decorator does not match a `$schema` that Hub bundles (deployment, kubernetes, control-evaluation, base decorator) | 400, at most 20 errors and `moreErrors` |
| A key that the store cannot keep | 400 |

Delete needs `global_admin` (as before), deletes the whole history, and gives 409 if another write supersedes the decorator first. In GitHub mode, delete gives 501 before it reads the history.

**Stores.** MongoDB stores the decorator as Hub checked it (a key such as `$numberInt` stays data; a large integer keeps up to 34 digits), and maps write failures to the storage errors. MongoDB refuses a key with a NUL character. [Nitrite dotted keys: owner decision pending]

Deliberate differences from ADR 0017 (#3581): no built-in `validation` type or `system` flag; a `PUT` supersedes the decorator it names (201), not the one with the same data key; the schema check runs in Hub with vertx-json-schema, not through calm-server; decorators stay in one document per namespace (#3639 is not done), so at 16 MB a write gives 413.

The Hub-owned times come in a later PR of this stack.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [x] ✨ New feature (non-breaking change which adds functionality)
- [x] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [ ] 🔧 Chore (maintenance, dependencies, CI, etc.)

💥 because the decorator write API refuses bodies that it accepted before (wrong field types, over 1 MiB, a schema mismatch, keys the store cannot keep), a `PUT` of a reserved type returns 201 and a new id, and `DELETE` removes the whole history. The 400 for invalid JSON no longer echoes the parser message.

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] Documentation (`docs/`)
- [x] Dependencies (`io.vertx:vertx-json-schema`, version from the Quarkus BOM)
(other boxes unchecked)

## Commit Message Format ✅
`feat(calm-hub): reserve decorator types, check decorator schemas and keep history`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Unit and `@QuarkusTest` tests for the write service, resource, MCP tools, schema validator, history chain and the three stores. Integration: `MongoDecoratorIntegration` (MongoDB 5.0 and 8) and `NitriteDecoratorIntegration`.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```
</details>

## P06: `feat(calm-hub): load extension manifests and list them at /api/calm/extensions`

Commit `5dd84551`. From I2 (`1ae0df50`) with the I2 fixes: `6d278fa2` (ambiguous routes, duplicate view ids), `63e25eb0` (unknown-id warning as an environment variable, registry part), `b19856b4` (designer-tab warning), `85abf305` (example manifest `readOnly` screen route).

Files (22): `ExtensionsConfig`, `ExtensionManifest`, `ExtensionManifestLoader`, `ExtensionRegistry`, `RegisteredExtension`, `ExtensionResource`, `extension.schema.json`, `builtin/index.txt` (empty), example manifest, three test resources, five tests, `pom.xml` (comment), `application.properties` (native include), `.gitignore`, `calm-hub/AGENTS.md`, `docs/docs/calm-hub/index.md`.

- `ExtensionsConfig` has no `identity()` or `http()` group. P08 adds `identity()`, and P09 adds `http()`, `allowWithoutAuth()` and the per-id limit keys. So `RESERVED_IDS` is `{"dir"}` at P06, and the reserved-id test uses `dir`. P08 and P09 add `identity`, `http` and `allow-without-auth`.
- `PER_ID_KEYS` is `enabled`, `order`, `backend-url`. P09 adds the others.
- The docs keep I2's note "CALM Hub reads, checks and lists manifests. It does not call extension services yet." P09 removes it.
- `ExtensionManifest.Overlay` has no `hide`, `key` or `time`, and `default` stays required: P11 adds them with the built-in manifests.

Java to compile (11): main `config/ExtensionsConfig`, `domain/extensions/ExtensionManifest`, `extensions/{ExtensionManifestLoader,ExtensionRegistry,RegisteredExtension}`, `resources/ExtensionResource`; tests `TestExtensionManifestLoaderShould`, `TestExtensionRegistryShould`, `TestExtensionResource{,Configured,ReadOnly}Should`.

Deliberate differences from ADR 0012:

| ADR 0012 | P06 |
|---|---|
| Static settings include the signing key and HTTP limits | Only `dir` at P06. P08 and P09 add the others |
| Java checks only route references, the `{namespace}` parameter, the id and the tool name length | Also: the `{domain}` parameter of a `domain_*` route, a repeated parameter, a `..` segment, a reserved id, two routes that one path can match with the same priority, and a decorator view id that two enabled extensions declare. A designer tab that the UI cannot fill gives a warning |
| The registry reads per-id settings by full name | Also warns about a per-id setting, as a property or an environment variable, for an unknown id |

<details><summary>Draft PR body</summary>

```markdown
## Description
Part of #3396 (PR 6 of a stack).

CALM Hub reads extension manifests (`extension.json`) at start up, from `calm.extensions.dir` and from a built-in classpath index (ADR 0012). Hub checks each manifest against the hubApi 0 JSON Schema (`META-INF/calm-extensions/schema/0/extension.schema.json`, unknown fields are errors), then checks the cross-references: route ids, the `{namespace}` or `{domain}` parameter of a scoped route, two routes that one path can match with the same priority, commands and contributions that name a route, and decorator view ids that two enabled extensions declare. A bad manifest or setting stops start up and names the file or the setting.

Per-id settings (`calm.extensions."<id>".enabled`, `order`, `backend-url`) work as properties and as environment variables. Hub warns about a setting for an unknown id. `GET /api/calm/extensions` lists the enabled extensions for any signed-in user. It never shows the backend URL, and on a read-only Hub it leaves out the write routes that are not `readOnly`, with the commands and contributions that use them.

Hub does not call extensions yet: the proxy and the identity assertion come in later PRs of this stack.

Deliberate differences from ADR 0012: the Java checks go further than the ADR list (the `{domain}` parameter, ambiguous routes, duplicate decorator view ids, a warning for a designer tab that the UI cannot fill). The signing key and HTTP limit settings come with the PRs that use them.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [x] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [ ] 🔧 Chore (maintenance, dependencies, CI, etc.)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] Documentation (`docs/`)
(other boxes unchecked)

## Commit Message Format ✅
`feat(calm-hub): load extension manifests and list them at /api/calm/extensions`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

`TestExtensionManifestLoaderShould`, `TestExtensionRegistryShould`, and `@QuarkusTest` tests of the endpoint with no extensions, with the example manifest, and on a read-only Hub.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```
</details>

