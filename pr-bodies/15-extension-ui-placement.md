Title: feat(calm-hub-ui): give extension contributions one place each in the UI
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
