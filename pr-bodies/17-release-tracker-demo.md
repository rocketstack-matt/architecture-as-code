Title: chore(calm-hub): add a release-tracker demo extension
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
- [ ] I have tested my changes locally
- [x] I have added/updated unit tests
- [ ] All existing tests pass

- `node --test` on `local-dev/demo-extensions/release-tracker`: the route and server tests.
- `TestExtensionManifestLoaderShould` loads the demo manifest and checks its extension points.

[runner result to follow]

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
