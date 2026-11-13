Title: feat(calm-hub-ui): draw decorator overlays and show deployments as a decorator view
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
