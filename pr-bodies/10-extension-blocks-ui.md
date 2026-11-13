Title: feat(calm-hub-ui): render Tier 1 extension blocks
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
