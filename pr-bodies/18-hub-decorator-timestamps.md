Title: feat(calm-hub)!: set decorator timestamps in Hub
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
