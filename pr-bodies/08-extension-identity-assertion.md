Title: feat(calm-hub): sign an identity assertion for extensions and publish a JWKS
Branch: feat/3396-08-extension-identity-assertion

## Description
Part 8 of 19 of #3396. Based on [PR 7] (merge that first).

Hub can sign a short-lived JWT (`typ: calm-ext+jwt`) that tells an extension backend who calls it. The public keys are at `GET /api/calm/auth/jwks`, which is public.

- The signer uses the JDK, not a JWT library. It takes an RSA (2048 bits or more) or P-256 key; a shared secret is refused.
- A bearer token with `typ: calm-ext+jwt` is refused in every auth mode, so an extension cannot replay an assertion to Hub. The mechanism sends the 401 itself, so an OIDC provider that is down cannot make it a 500.
- Settings: `calm.extensions.identity.private-key-location`, `public-key-locations` (key rotation) and `ttl-seconds`.

Gotchas:
- Hub now refuses to start with an enabled extension that has routes and no signing key. Nothing signs yet: the proxy in PR 9 calls `sign()`.
- The "Try it" command in `calm-hub/AGENTS.md` does not work at this PR: it needs the proxy and the example backend, which PR 9 adds. PR 9 replaces it with the example-services README.

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
`feat(calm-hub): sign an identity assertion for extensions and publish a JWKS`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4207 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
