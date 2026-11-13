# #3396 PR stack: 19 PRs for finos/architecture-as-code

On finos main `2e7d32ba`. Each PR is one commit, based on the one before. Every PR with Java passed a full run on a Linux runner (Java, integration with Docker, UI, docs, cli, shared). Nothing is on finos yet.

| NN | Branch | Title | Base |
|---|---|---|---|
| 01 | `feat/3396-01-mcp-read-only-guard` | `fix(calm-hub): refuse MCP write tools on a read-only Hub` | `main` |
| 02 | `feat/3396-02-mongodb-5-tests` | `chore(calm-hub): test against MongoDB 5.0, the oldest supported version` | `feat/3396-01-mcp-read-only-guard` |
| 03 | `feat/3396-03-nitrite-integration-suites` | `test(calm-hub): run the Nitrite integration suites on Nitrite` | `feat/3396-02-mongodb-5-tests` |
| 04 | `feat/3396-04-decorators-tab-registry` | `feat(calm-hub-ui): add a diagram tab registry and a generic Decorators view` | `feat/3396-03-nitrite-integration-suites` |
| 05 | `feat/3396-05-decorator-reserved-types-history` | `feat(calm-hub): reserve decorator types, check decorator schemas and keep history` | `feat/3396-04-decorators-tab-registry` |
| 06 | `feat/3396-06-extension-manifest-registry` | `feat(calm-hub): load extension manifests and list them at /api/calm/extensions` | `feat/3396-05-decorator-reserved-types-history` |
| 07 | `feat/3396-07-decorator-overlays` | `feat(calm-hub-ui): draw decorator overlays and show deployments as a decorator view` | `feat/3396-06-extension-manifest-registry` |
| 08 | `feat/3396-08-extension-identity-assertion` | `feat(calm-hub): sign an identity assertion for extensions and publish a JWKS` | `feat/3396-07-decorator-overlays` |
| 09 | `feat/3396-09-extension-route-proxy` | `feat(calm-hub): proxy extension routes with a signed identity assertion` | `feat/3396-08-extension-identity-assertion` |
| 10 | `feat/3396-10-extension-blocks-ui` | `feat(calm-hub-ui): render Tier 1 extension blocks` | `feat/3396-09-extension-route-proxy` |
| 11 | `feat/3396-11-registry-decorator-views` | `feat(calm-hub-ui): load decorator views from the extension registry` | `feat/3396-10-extension-blocks-ui` |
| 12 | `feat/3396-12-cli-extension-commands` | `feat(cli): add hub extension commands` | `feat/3396-11-registry-decorator-views` |
| 13 | `feat/3396-13-linear-time-input-patterns` | `feat(calm-hub): check extension command input patterns in linear time` | `feat/3396-12-cli-extension-commands` |
| 14 | `feat/3396-14-extension-mcp-tools` | `feat(calm-hub): add MCP tools for extension commands` | `feat/3396-13-linear-time-input-patterns` |
| 15 | `feat/3396-15-extension-ui-placement` | `feat(calm-hub-ui): give extension contributions one place each in the UI` | `feat/3396-14-extension-mcp-tools` |
| 16 | `feat/3396-16-overlay-toggles` | `feat(calm-hub-ui): toggle decorator overlays per extension` | `feat/3396-15-extension-ui-placement` |
| 17 | `feat/3396-17-release-tracker-demo` | `chore(calm-hub): add a release-tracker demo extension` | `feat/3396-16-overlay-toggles` |
| 18 | `feat/3396-18-hub-decorator-timestamps` | `feat(calm-hub)!: set decorator timestamps in Hub` | `feat/3396-17-release-tracker-demo` |
| 19 | `feat/3396-19-extension-docs-tutorial` | `docs: add CALM Hub extension guides and tutorial` | `feat/3396-18-hub-decorator-timestamps` |

---

# fix(calm-hub): refuse MCP write tools on a read-only Hub

Branch: feat/3396-01-mcp-read-only-guard
## Description
Part 1 of 19 of #3396. Based on `main`.

MCP is served by Vert.x routes, not JAX-RS, so `ReadOnlyRequestFilter` never sees it. A read-only Hub ran the MCP write tools.

This PR puts `@ReadOnlyHubGuard` on each MCP tool class. On a read-only Hub, its interceptor refuses each tool that needs more than a read scope, and the tool returns an error. The check runs before the permission check, so a caller without the scope also gets the read-only error.

`TestMcpToolsReadOnlyShould` calls every MCP tool bean, so a new tool class that changes data and has no guard fails the test. `McpTestClient` is a small MCP client for tests; PR 14 uses it again.

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

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 3882 Java tests, 0 failures, 0 errors, 2 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe. The MongoDB suites use a `mongo:4.4.3` container. The 17 Nitrite suites also run on MongoDB here, because of the test bug that PR 3 fixes.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# chore(calm-hub): test against MongoDB 5.0, the oldest supported version

Branch: feat/3396-02-mongodb-5-tests
## Description
Part 2 of 19 of #3396. Based on [PR 1] (merge that first).

MongoDB 4.4 refuses a `$`-prefixed key in an update, so it cannot store a decorator that has a `$schema` (PR 5 checks decorators against their `$schema`). CALM Hub's oldest supported MongoDB is now 5.0, and the integration suite runs on `mongo:5.0` (before: `mongo:4.4.3`).

The `calm.it.mongo-image` property selects another image, for example `-Dcalm.it.mongo-image=mongo:8`, because deploy uses `mongo:latest`. The docs now give 5.0 as the oldest version.

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
`chore(calm-hub): test against MongoDB 5.0, the oldest supported version`

## Testing
- [x] I have tested my changes locally
- [ ] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 3882 Java tests, 0 failures, 0 errors, 2 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe. The MongoDB suites use a `mongo:5.0` container (the default of `calm.it.mongo-image`). The 17 Nitrite suites still run on MongoDB here; PR 3 fixes that.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [ ] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# test(calm-hub): run the Nitrite integration suites on Nitrite

Branch: feat/3396-03-nitrite-integration-suites
## Description
Part 3 of 19 of #3396. Based on [PR 2] (merge that first).

`NitriteEndToEndResource` gave its config only as the returned map. That map does not reach `@ConfigProperty` or `@LookupIfProperty` (quarkusio/quarkus#52919), so since #3116 the Nitrite integration suites ran on MongoDB. The resource now also sets its config as system properties, as `EndToEndResource` does, and clears them when it stops.

This is the first run of the Nitrite suites on Nitrite since #3116. They all pass.

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
- [ ] Documentation (`docs/`)
- [ ] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [ ] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`test(calm-hub): run the Nitrite integration suites on Nitrite`

## Testing
- [x] I have tested my changes locally
- [ ] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 3882 Java tests, 0 failures, 0 errors, 2 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [ ] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub-ui): add a diagram tab registry and a generic Decorators view

Branch: feat/3396-04-decorators-tab-registry
## Description
Part 4 of 19 of #3396. Based on [PR 3] (merge that first).

The diagram section's tabs now come from one registry (`DIAGRAM_TABS`), so a new tab is one entry. An unknown `?tab=` value opens the diagram and is dropped from the URL. A hidden tab, such as Used by before the pattern summary loads, is kept.

A new **Decorators** tab lists every decorator of the architecture version, of any type, with a type filter in the URL (`?tab=decorators&type=deployment`). A card shows the type, `applies-to`, the times when Hub returns them, and `data` with links, dates, lists, tables and collapsible values. Its JSON view shows the decorator as a write takes it, so it can be copied into a `PUT`. The details drawer lists the decorators of the selected node or relationship.

`DiagramSection` polls the decorators with one request every 5 s, only while the diagram, a decorator tab or the details drawer shows them. After three failures it backs off to 30 s. It tells an architecture that Hub has no mapping for from a Hub that does not answer.

Also: a tap on a truncated environment pill shows the full name, because a touch screen has no hover.

Not yet: the Deployments tab stays until PR 7, which draws decorators on the diagram and makes deployments a decorator view. Hub sets the decorator times from PR 18.

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
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [ ] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
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
`feat(calm-hub-ui): add a diagram tab registry and a generic Decorators view`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

This PR changes no Java. calm-hub-ui: lint (0 errors), `vitest run` (2375 tests pass) and the build pass. The docs build passes.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub): reserve decorator types, check decorator schemas and keep history

Branch: feat/3396-05-decorator-reserved-types-history
## Description
Part 5 of 19 of #3396. Based on [PR 4] (merge that first).

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

Not yet: Hub-owned times, and the refusal of Hub-owned fields in a write body. PR 18 adds both.

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

Dependency: `io.vertx:vertx-json-schema`, version from the Quarkus BOM.

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
- [x] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`feat(calm-hub): reserve decorator types, check decorator schemas and keep history`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4075 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub): load extension manifests and list them at /api/calm/extensions

Branch: feat/3396-06-extension-manifest-registry
## Description
Part 6 of 19 of #3396. Based on [PR 5] (merge that first).

CALM Hub reads extension manifests (`extension.json`) at start up, from `calm.extensions.dir` and from a built-in classpath index (ADR 0012). Hub checks each manifest against the hubApi 0 JSON Schema (`META-INF/calm-extensions/schema/0/extension.schema.json`, unknown fields are errors), then checks the cross-references: route ids, the `{namespace}` or `{domain}` parameter of a scoped route, two routes that one path can match with the same priority, commands and contributions that name a route, and decorator view ids that two enabled extensions declare. A bad manifest or setting stops start up and names the file or the setting.

Per-id settings (`calm.extensions."<id>".enabled`, `order`, `backend-url`) work as properties and as environment variables. Hub warns about a setting for an unknown id. `GET /api/calm/extensions` lists the enabled extensions for any signed-in user. It never shows the backend URL, and on a read-only Hub it leaves out the write routes that are not `readOnly`, with the commands and contributions that use them.

Not yet: Hub does not call extensions. PR 8 adds the identity assertion and PR 9 the proxy, with their settings.

Deliberate differences from ADR 0012: the Java checks go further than the ADR list (the `{domain}` parameter, ambiguous routes, duplicate decorator view ids, a warning for a designer tab that the UI cannot fill).

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
`feat(calm-hub): load extension manifests and list them at /api/calm/extensions`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4164 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub-ui): draw decorator overlays and show deployments as a decorator view

Branch: feat/3396-07-decorator-overlays
## Description
Part 7 of 19 of #3396. Based on [PR 6] (merge that first).

One overlay engine draws decorators on the diagram from `decorator-views` entries. Each node or relationship gets a badge with its status (ok, warn, error, info), and an error or a warning also colours the element. Control evaluations and deployments are the two built-in views. They are bundled in the UI for now; PR 11 loads them from the extension registry.

- The Deployments tab and its panel are removed. `?tab=deployments` now opens the Decorators tab filtered to `deployment`.
- The legend lists each view on screen, with counts by status and a toggle. **View all** opens the Decorators tab filtered to the view's type and `$schema`, and moves focus to it. Below 1024 px the legend starts closed.
- The details drawer gets the containment map, so a container lists each decorator that its badges count. Its list is now headed "All decorators", because a badge shows only the newest decorator of each key.
- Badges follow the diagram text size.

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
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [ ] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
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
`feat(calm-hub-ui): draw decorator overlays and show deployments as a decorator view`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

This PR changes no Java. calm-hub-ui: lint (0 errors), `vitest run` (2401 tests pass) and the build pass. The docs build passes.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub): sign an identity assertion for extensions and publish a JWKS

Branch: feat/3396-08-extension-identity-assertion
## Description
Part 8 of 19 of #3396. Based on [PR 7] (merge that first).

Hub can sign a short-lived JWT (`typ: calm-ext+jwt`) that tells an extension backend who calls it. The public keys are at `GET /api/calm/auth/jwks`, which is public.

- The signer uses the JDK, not a JWT library. It takes an RSA (2048 bits or more) or P-256 key; a shared secret is refused.
- A bearer token with `typ: calm-ext+jwt` is refused in every auth mode, so an extension cannot replay an assertion to Hub. The mechanism sends the 401 itself, so an OIDC provider that is down cannot make it a 500.
- Settings: `calm.extensions.identity.private-key-location`, `public-key-locations` (key rotation) and `ttl-seconds`.

Gotchas:
- Hub now refuses to start with an enabled extension that has routes and no signing key. Nothing signs yet: the proxy in PR 9 calls `sign()`.
- The "Try it" command in `calm-hub/AGENTS.md` does not work at this PR: it needs the proxy and the example backend, which PR 9 adds. PR 9 replaces it with the example-services README.

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
`feat(calm-hub): sign an identity assertion for extensions and publish a JWKS`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4207 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub): proxy extension routes with a signed identity assertion

Branch: feat/3396-09-extension-route-proxy
## Description
Part 9 of 19 of #3396. Based on [PR 8] (merge that first).

`/api/calm/extensions/{id}/api/{route path}` calls the extension backend for a route that the manifest declares. Hub sends the signed identity assertion (PR 8) and the caller's context.

- Hub checks the route scope, the resource permission and read-only mode before the call. A read-only Hub lets through every `GET` route and each route marked `readOnly`. `ReadOnlyRequestFilter` leaves the proxy path to the proxy.
- Request and response size, and connect and read time, have limits (global and per extension). A redirect, a 401, 407 or 5xx reply, or a content type that Hub does not pass on, becomes a generic `502`; a timeout is `504`.
- Hub audits each call to a route that is not `readOnly`. The audit enums get new values; `developer-guide.md` says what a rollback must do with these rows.
- A path value with an encoded `/` (`%2F`) or another part that ADR 0011 refuses is refused (`ExtensionPaths`). `path-values.json` holds the values that each client must refuse in the same way.
- `local-dev/extensions/example-services` is an example backend that checks the assertion.

Gotchas:
- Hub now refuses a `POST` with no JSON `Content-Type` (`415`), also with no body. The CLI sends one only from PR 12. No released client calls extension routes, so no released client is affected.
- Some text names the MCP tools, which use the proxy only from PR 14.

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
`feat(calm-hub): proxy extension routes with a signed identity assertion`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4410 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub-ui): render Tier 1 extension blocks

Branch: feat/3396-10-extension-blocks-ui
## Description
Part 10 of 19 of #3396. Based on [PR 9] (merge that first).

The UI loads the extension registry and shows each contribution from the JSON blocks that its route returns: markdown, key-value, stats, table, cards and links. Hub serves the blocks schema at `/api/calm/extensions/schema/0/blocks.schema.json`.

- A screen has its own page (`/extensions/:extensionId/:contributionId`), a designer tab is a diagram tab, a detail panel shows in the node details, and a landing card on the home page. An action is a button; a route that is not `readOnly` asks first in a dialog.
- Calls go through the Hub proxy with the resource context (`namespace`, `resource`, `resourceType`, `resourceId`, `version`, `selectedElement`). A path value that Hub would refuse is refused before the call.
- `ExtensionsProvider` owns one `ExtensionService` and retries a failed registry load with a backoff. A registry `401` opens the sign-in prompt; an extension failure stays in its slot.
- A link to an extension tab keeps the tab until the registry loads.

Gotcha: the placements in this PR (`ExtensionPoints.tsx`, `extension-tabs.tsx`) are simple. PR 15 replaces them with one Extensions tab, a menu group and home cards, which scale to many extensions.

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
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [x] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
- [ ] CALM Lab (`calm-lab/`)
- [ ] CALM Models (`calm-models/`)
- [ ] CALM Server (`calm-server/`)
- [ ] CALM Widgets (`calm-widgets/`)
- [ ] CALMGuard (`calm-guard/`)
- [ ] Documentation (`docs/`)
- [ ] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [ ] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`feat(calm-hub-ui): render Tier 1 extension blocks`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4420 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub-ui): load decorator views from the extension registry

Branch: feat/3396-11-registry-decorator-views
## Description
Part 11 of 19 of #3396. Based on [PR 10] (merge that first).

The overlays now read their decorator views from `GET /api/calm/extensions`. Hub ships `control-evaluation` and `deployment` as built-in extensions on the classpath, so an operator can turn one off.

- If the registry cannot be loaded, the UI draws its bundled copy of the built-in views. A test keeps that copy the same as the manifests. When a retry loads the registry, the UI reads the views again.
- A manifest overlay can now declare `hide` (values to leave off), `key` and `time` (keep the newest entry of each key). The UI engine reads them since PR 7.
- The registry and the decorator views share one request.

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
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [x] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
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
`feat(calm-hub-ui): load decorator views from the extension registry`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4424 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(cli): add hub extension commands

Branch: feat/3396-12-cli-extension-commands
## Description
Part 12 of 19 of #3396. Based on [PR 11] (merge that first).

- `calm hub extensions list` and `calm hub extensions describe` show the enabled extensions, their commands, routes and input schemas.
- `calm hub ext <id> <command> [--input <file|->] [--arg key=value]...` runs an extension command through the Hub proxy.

The shared client builds the request from the command's route. Input that matches a `{param}` fills the path; the rest goes to the query for `GET` and `DELETE`, and to the JSON body otherwise. It refuses, before the call, a path value that Hub would refuse and a value that makes the path match another route. CALM Hub checks the route, the path and the scope, but not the input: the extension checks it. A write sends `Content-Type: application/json`, which Hub requires since PR 9.

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
- [x] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [ ] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [ ] CALM Hub UI (`calm-hub-ui/`)
- [ ] CALM Lab (`calm-lab/`)
- [ ] CALM Models (`calm-models/`)
- [ ] CALM Server (`calm-server/`)
- [ ] CALM Widgets (`calm-widgets/`)
- [ ] CALMGuard (`calm-guard/`)
- [x] Documentation (`docs/`)
- [x] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [ ] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`feat(cli): add hub extension commands`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4424 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub): check extension command input patterns in linear time

Branch: feat/3396-13-linear-time-input-patterns
## Description
Part 13 of 19 of #3396. Based on [PR 12] (merge that first).

`EcmaRegex` checks that a JSON Schema `pattern` is an ECMA-262 regular expression with the `u` flag, as MCP clients compile it. It also writes the pattern in RE2 syntax, so that Hub can match caller input in linear time with RE2J. A pattern with a lookaround, a back reference or a Unicode property has no RE2 form with the same meaning, so it is refused. Size and depth limits keep the parsers inside their stacks.

Not yet: the class has no caller. The MCP extension tools use it in PR 14.

Dependency: `com.google.re2j:re2j` 1.8.

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
- [ ] Documentation (`docs/`)
- [ ] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [x] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`feat(calm-hub): check extension command input patterns in linear time`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4586 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [ ] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub): add MCP tools for extension commands

Branch: feat/3396-14-extension-mcp-tools
## Description
Part 14 of 19 of #3396. Based on [PR 13] (merge that first).

When MCP is on, CALM Hub makes one `ext_<id>_<command>` tool for each command of an enabled extension. A call goes through `ExtensionProxyService` (PR 9), so it has the same scope, read-only, audit and size rules as a REST call (ADR 0011: MCP does not pass through the JAX-RS filters).

Important decisions:
- Hub checks the scope (`ExtensionProxyService.checkAccess`) before the input schema, so a caller with no scope cannot make Hub do the schema work.
- vertx must not run `java.util.regex` on caller input: some valid patterns take hours. Hub moves each input `pattern` into a Hub `format` that RE2J checks in linear time (`EcmaRegex`, PR 13). An input schema with no RE2 form is refused.
- MCP TypeScript SDK clients lose every tool when one schema does not compile. So Hub accepts only a subset of JSON Schema 2020-12 (no `$id` or anchors, local `$ref`s, limited depth), and skips other commands with a warning. A manifest never stops Hub.
- Manifests are trusted operator configuration. The start-up checks catch usual mistakes; they do not try to stop a schema made to be slow.

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
`feat(calm-hub): add MCP tools for extension commands`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4778 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub-ui): give extension contributions one place each in the UI

Branch: feat/3396-15-extension-ui-placement
## Description
Part 15 of 19 of #3396. Based on [PR 14] (merge that first).

Each kind of extension contribution now has one place in the Hub UI, so the UI scales to many extensions:

| Contribution | Place |
|---|---|
| `landing-card`, `screen` | An Extensions section of cards on the home page |
| `screen` | An Extensions group in the side menu |
| `designer-tab`, `action` | One Extensions tab on architecture and pattern pages, with a collapsible section per extension |
| `detail-panel` | One Extensions section in the node details |

A closed section renders nothing, so it sends no request. Actions keep the confirm dialog and the run state of PR 10.

This removes the per-extension placements of PR 10 (`ExtensionPoints.tsx`, `extension-tabs.tsx`). The Extensions tab is hidden, not unknown, until the registry loads, so a link to it keeps the tab.

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
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [ ] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
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
`feat(calm-hub-ui): give extension contributions one place each in the UI`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

This PR changes no Java. calm-hub-ui: lint (0 errors), `vitest run` (2653 tests pass) and the build pass. The docs build passes.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub-ui): toggle decorator overlays per extension

Branch: feat/3396-16-overlay-toggles
## Description
Part 16 of 19 of #3396. Based on [PR 15] (merge that first).

Each decorator view now carries its `source` (the extension that declares it). The UI keys a view by extension and view id (`viewKey()`), not by view id alone: a disabled extension frees its view id for another one, and a stored legend choice must not move to it.

- The legend groups views by extension, with a colour marker, and the user can turn each view on or off. The choice is kept in `localStorage`.
- With no stored choice, the built-in views and the first three extension views (in registry order) are on. The default uses the registered views, not the views drawn, so it is the same on each diagram.
- A click on a badge opens its details.
- The control-evaluation callouts use `isControlEvaluationView()`: the id and `source.builtIn`.

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
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [ ] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
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
`feat(calm-hub-ui): toggle decorator overlays per extension`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

This PR changes no Java. calm-hub-ui: lint (0 errors), `vitest run` (2697 tests pass) and the build pass. The docs build passes.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# chore(calm-hub): add a release-tracker demo extension

Branch: feat/3396-17-release-tracker-demo
## Description
Part 17 of 19 of #3396. Based on [PR 16] (merge that first).

`release-tracker` is a local demo extension that uses every UI extension point: a screen, a landing card, an action, a designer tab, a detail panel and a decorator view. Use it to check the Hub UI layout. Its backend has no dependencies and verifies the Hub identity assertion with the example-services verifier.

It is in `local-dev/demo-extensions`, not `local-dev/extensions`: it has routes, so a Hub that loads it without a backend URL does not start. The designer tab route uses `{resourceType}/{resourceId}`, because Hub refuses `%2F` in a path.

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
- [ ] Documentation (`docs/`)
- [ ] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [ ] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`chore(calm-hub): add a release-tracker demo extension`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

- `node --test` on `local-dev/demo-extensions/release-tracker`: the route and server tests.
- `TestExtensionManifestLoaderShould` loads the demo manifest and checks its extension points.

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4780 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass (11 of 11).
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# feat(calm-hub)!: set decorator timestamps in Hub

Branch: feat/3396-18-hub-decorator-timestamps
## Description
Part 18 of 19 of #3396. Based on [PR 17] (merge that first).

Hub now records when it writes each decorator:

| Field | Set when |
|---|---|
| `creationDateTime` | Hub stores the decorator |
| `updateDateTime` | Hub stores the decorator, and on each in-place update |
| `supersededDateTime` (history entry) | A newer decorator supersedes this one |

Hub keeps the times in its own storage fields, not in the decorator, and returns them on every read, also through MCP. A decorator stored before this change has no times. Hub never invents a `creationDateTime` for it; an in-place update gives it an `updateDateTime` only.

The UI already shows the times when Hub returns them (PR 4). This PR adds a test with a Hub reply.

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

💥 because a client that sends `creationDateTime`, `updateDateTime`, `supersededDateTime`, `supersedes` or `supersededBy` on a decorator now gets `400`. Hub sets these fields. Before this PR, such a field was stored as decorator data.

## Affected Components
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [x] CALM Hub (`calm-hub/`)
- [ ] CALM Diagram (`calm-diagram/`, `calm-docusaurus-plugin/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
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
`feat(calm-hub)!: set decorator timestamps in Hub`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4814 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards

---

# docs: add CALM Hub extension guides and tutorial

Branch: feat/3396-19-extension-docs-tutorial
## Description
Part 19 of 19 of #3396. Based on [PR 18] (merge that first).

Adds the extension documentation:

| Page | For |
|---|---|
| Build and install a CALM Hub extension (tutorial) | From the manifest and the backend to the Hub UI, the CLI and MCP, with the release-tracker demo (PR 17) |
| Extension points | The fields, the context and the limits of each extension point and of commands |
| Extension blocks | The JSON that the UI draws |
| Decorator views | Drawing decorators on the diagram, with no backend |
| Extension access | The scopes, the identity assertion and the trust model |

The CALM Hub pages, `calm-hub-ui/AGENTS.md` and the sidebar link to them. The access table in the MCP and API reference now lists `domain_admin`.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [ ] 🔧 Chore (maintenance, dependencies, CI, etc.)

## Affected Components
- [ ] CLI (`cli/`)
- [ ] Schema (`calm/`)
- [ ] CALM AI (`calm-ai/`)
- [ ] CALM Hub (`calm-hub/`)
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
`docs: add CALM Hub extension guides and tutorial`

## Testing
- [x] I have tested my changes locally
- [ ] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4814 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [ ] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
