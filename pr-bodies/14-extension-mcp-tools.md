Title: feat(calm-hub): add MCP tools for extension commands
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
