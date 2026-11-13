Title: feat(calm-hub-ui): add a diagram tab registry and a generic Decorators view
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
