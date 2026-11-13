Title: feat(calm-hub): proxy extension routes with a signed identity assertion
Branch: feat/3396-09-extension-route-proxy

## Description
Part 9 of 19 of #3396. Based on [PR 8] (merge that first).

`/api/calm/extensions/{id}/api/{route path}` calls the extension backend for a route that the manifest declares. Hub sends the signed identity assertion (PR 8) and the caller's context.

- Hub checks the route scope, the resource permission and read-only mode before the call. A read-only Hub lets through every `GET` route and each route marked `readOnly`. `ReadOnlyRequestFilter` leaves the proxy path to the proxy.
- Request and response size, and connect and read time, have limits (global and per extension). A redirect, a 401, 407 or 5xx reply, or a content type that Hub does not pass on, becomes a generic `502`; a timeout is `504`.
- Hub audits each call to a route that is not `readOnly`. The audit enums get new values; `developer-guide.md` says what a rollback must do with these rows.
- A path value with an encoded `/` (`%2F`) or another part that ADR 0011 refuses is refused (`ExtensionPaths`). `path-values.json` holds the values that each client must refuse in the same way.
- `local-dev/extensions/example-services` is an example backend that checks the assertion.

Gotchas:
- Hub now refuses a `POST` with no JSON `Content-Type` (`415`), also with no body. The CLI sends one only from PR 12. No released client calls extension routes, so no released client is affected.
- Some text names the MCP tools, which use the proxy only from PR 14.

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
`feat(calm-hub): proxy extension routes with a signed identity assertion`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4410 Java tests, 0 failures, 0 errors, 8 skipped.
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
