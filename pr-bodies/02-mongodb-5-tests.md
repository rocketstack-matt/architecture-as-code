Title: chore(calm-hub): test against MongoDB 5.0, the oldest supported version
Branch: feat/3396-02-mongodb-5-tests

## Description
Part 2 of 19 of #3396. Based on [PR 1] (merge that first).

MongoDB 4.4 refuses a `$`-prefixed key in an update, so it cannot store a decorator that has a `$schema` (PR 5 checks decorators against their `$schema`). CALM Hub's oldest supported MongoDB is now 5.0, and the integration suite runs on `mongo:5.0` (before: `mongo:4.4.3`).

The `calm.it.mongo-image` property selects another image, for example `-Dcalm.it.mongo-image=mongo:8`, because deploy uses `mongo:latest`. The docs now give 5.0 as the oldest version.

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
- [x] Documentation (`docs/`)
- [ ] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [ ] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`chore(calm-hub): test against MongoDB 5.0, the oldest supported version`

## Testing
- [x] I have tested my changes locally
- [ ] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 3882 Java tests, 0 failures, 0 errors, 2 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe. The MongoDB suites use a `mongo:5.0` container (the default of `calm.it.mongo-image`). The 17 Nitrite suites still run on MongoDB here; PR 3 fixes that.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [ ] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
