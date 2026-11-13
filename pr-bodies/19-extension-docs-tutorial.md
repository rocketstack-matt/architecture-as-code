Title: docs: add CALM Hub extension guides and tutorial
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
