Title: feat(calm-hub): load extension manifests and list them at /api/calm/extensions
Branch: feat/3396-06-extension-manifest-registry

## Description
Part 6 of 19 of #3396. Based on [PR 5] (merge that first).

CALM Hub reads extension manifests (`extension.json`) at start up, from `calm.extensions.dir` and from a built-in classpath index (ADR 0012). Hub checks each manifest against the hubApi 0 JSON Schema (`META-INF/calm-extensions/schema/0/extension.schema.json`, unknown fields are errors), then checks the cross-references: route ids, the `{namespace}` or `{domain}` parameter of a scoped route, two routes that one path can match with the same priority, commands and contributions that name a route, and decorator view ids that two enabled extensions declare. A bad manifest or setting stops start up and names the file or the setting.

Per-id settings (`calm.extensions."<id>".enabled`, `order`, `backend-url`) work as properties and as environment variables. Hub warns about a setting for an unknown id. `GET /api/calm/extensions` lists the enabled extensions for any signed-in user. It never shows the backend URL, and on a read-only Hub it leaves out the write routes that are not `readOnly`, with the commands and contributions that use them.

Not yet: Hub does not call extensions. PR 8 adds the identity assertion and PR 9 the proxy, with their settings.

Deliberate differences from ADR 0012: the Java checks go further than the ADR list (the `{domain}` parameter, ambiguous routes, duplicate decorator view ids, a warning for a designer tab that the UI cannot fill).

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
`feat(calm-hub): load extension manifests and list them at /api/calm/extensions`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4164 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
