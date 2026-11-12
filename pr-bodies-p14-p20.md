## Draft PR bodies

### P14: `feat(calm-hub): add MCP tools for extension commands`

```markdown
## Description
When MCP is on, CALM Hub makes one `ext_<id>_<command>` tool for each command of an enabled extension. A call goes through `ExtensionProxyService`, so it has the same scope, read-only, audit and size rules as a REST call (ADR 0011: MCP does not pass through the JAX-RS filters).

Important decisions:
- Hub checks the scope (`ExtensionProxyService.checkAccess`) before the input schema, so a caller with no scope cannot make Hub do the schema work.
- vertx must not run `java.util.regex` on caller input: some valid patterns take hours. Hub moves each input `pattern` into a Hub `format` that RE2J checks in linear time (`EcmaRegex`, the previous PR). An input schema with no RE2 form is refused.
- MCP TypeScript SDK clients lose every tool when one schema does not compile. So Hub accepts only a subset of JSON Schema 2020-12 (no `$id` or anchors, local `$ref`s, limited depth), and skips other commands with a warning. A manifest never stops Hub.
- Manifests are trusted operator configuration. The start-up checks catch usual mistakes; they do not try to stop a schema made to be slow.

Part of #3396.

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

## Testing
- New tests: `TestExtensionToolsShould` (schema subset, request mapping, refusals), `TestExtensionToolsMcpShould` (through the MCP endpoint), `TestExtensionToolsMcpDisabledShould`, `TestExtensionToolsReadOnlyShould`, and `checkAccess` cases in `TestExtensionProxyServiceShould`.
- The docs build passes.
- [Java: runner results to be added by the controller]

- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [ ] All existing tests pass

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P15: `feat(calm-hub-ui): give extension contributions one place each in the UI`

```markdown
## Description
Each kind of extension contribution now has one place in the Hub UI, so the UI scales to many extensions:

| Contribution | Place |
|---|---|
| `landing-card`, `screen` | An Extensions section of cards on the home page |
| `screen` | An Extensions group in the side menu |
| `designer-tab`, `action` | One Extensions tab on architecture and pattern pages, with a collapsible section per extension |
| `detail-panel` | One Extensions section in the node details |

A closed section renders nothing, so it sends no request. Actions keep the confirm dialog and the run state of the Tier 1 blocks PR.

This removes the per-extension placements (`ExtensionPoints.tsx`, `extension-tabs.tsx`) of the Tier 1 blocks PR. The Extensions tab is hidden, not unknown, until the registry loads, so a link to it keeps the tab.

Part of #3396.

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

## Testing
- calm-hub-ui: lint 0 errors, `vitest run` 2653 tests pass, the build passes.
- The docs build passes.

- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P16: `feat(calm-hub-ui): toggle decorator overlays per extension`

```markdown
## Description
Each decorator view now carries its `source` (the extension that declares it). The UI keys a view by extension and view id (`viewKey()`), not by view id alone: a disabled extension frees its view id for another one, and a stored legend choice must not move to it.

- The legend groups views by extension, with a colour marker, and the user can turn each view on or off. The choice is kept in `localStorage`.
- With no stored choice, the built-in views and the first three extension views (in registry order) are on. The default uses the registered views, not the views drawn, so it is the same on each diagram.
- A click on a badge opens its details.
- The control-evaluation callouts use `isControlEvaluationView()`: the id and `source.builtIn`.

Part of #3396.

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

## Testing
- calm-hub-ui: lint 0 errors, `vitest run` 2697 tests pass, the build passes.
- The docs build passes.

- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P17: `chore(calm-hub): add a release-tracker demo extension`

```markdown
## Description
`release-tracker` is a local demo extension that uses every UI extension point: a screen, a landing card, an action, a designer tab, a detail panel and a decorator view. Use it to check the Hub UI layout. Its backend has no dependencies and verifies the Hub identity assertion with the example-services verifier.

It is in `local-dev/demo-extensions`, not `local-dev/extensions`: it has routes, so a Hub that loads it without a backend URL does not start. The designer tab route uses `{resourceType}/{resourceId}`, because Hub refuses `%2F` in a path.

Part of #3396.

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

## Testing
- `node --test local-dev/demo-extensions/release-tracker/*.test.mjs`: 6 tests pass.
- `TestExtensionManifestLoaderShould` loads the demo manifest and checks its extension points.
- [Java: runner results to be added by the controller]

- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [ ] All existing tests pass

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P19: `feat(calm-hub): set decorator timestamps in Hub`

```markdown
## Description
Hub now records when it writes each decorator:

| Field | Set when |
|---|---|
| `creationDateTime` | Hub stores the decorator |
| `updateDateTime` | Hub stores the decorator, and on each in-place update |
| `supersededDateTime` (history entry) | A newer decorator supersedes this one |

Hub keeps the times in its own storage fields, not in the decorator, and returns them on every read, also through MCP. A write that sends a Hub-owned field (the times, `supersedes` or `supersededBy`) gets `400`. A decorator stored before this change has no times. Hub never invents a `creationDateTime` for it; an in-place update gives it an `updateDateTime` only.

The UI already shows the times when Hub returns them. This PR adds a test with a Hub reply.

Part of #3396.

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

## Testing
- New tests: `TestDecoratorTimestampsShould`, `TestMongoDecoratorTimestampsShould`, `TestNitriteDecoratorTimestampsShould`, and Hub-owned field cases in the resource, write service, MCP tool and integration tests.
- calm-hub-ui: lint 0 errors, `vitest run` 2698 tests pass, the build passes. The docs build passes.
- [Java: runner results to be added by the controller]

- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [ ] All existing tests pass

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P20: `docs: add CALM Hub extension guides and tutorial`

```markdown
## Description
Adds the extension documentation:

| Page | For |
|---|---|
| Build and install a CALM Hub extension (tutorial) | From the manifest and the backend to the Hub UI, the CLI and MCP, with the release-tracker demo |
| Extension points | The fields, the context and the limits of each extension point and of commands |
| Extension blocks | The JSON that the UI draws |
| Decorator views | Drawing decorators on the diagram, with no backend |
| Extension access | The scopes, the identity assertion and the trust model |

The CALM Hub pages and the sidebar link to them. The access table in the MCP and API reference now lists `domain_admin`.

Part of #3396.

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

## Testing
- The docs build passes (`onBrokenLinks: 'throw'`).

- [x] I have tested my changes locally
- [ ] I have added/updated unit tests
- [x] All existing tests pass

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [ ] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

