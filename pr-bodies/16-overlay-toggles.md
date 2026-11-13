Title: feat(calm-hub-ui): toggle decorator overlays per extension
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
