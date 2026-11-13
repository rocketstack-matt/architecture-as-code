# PR stack for #3396

| NN | Branch | Title | Base |
|---|---|---|---|
| 01 | `feat/3396-01-mcp-read-only-guard` | `fix(calm-hub): refuse MCP write tools on a read-only Hub` | `main` |
| 02 | `feat/3396-02-mongodb-5-tests` | `chore(calm-hub): test against MongoDB 5.0, the oldest supported version` | `feat/3396-01-mcp-read-only-guard` |
| 03 | `feat/3396-03-nitrite-integration-suites` | `test(calm-hub): run the Nitrite integration suites on Nitrite` | `feat/3396-02-mongodb-5-tests` |
| 04 | `feat/3396-04-decorators-tab-registry` | `feat(calm-hub-ui): add a diagram tab registry and a generic Decorators view` | `feat/3396-03-nitrite-integration-suites` |
| 05 | `feat/3396-05-decorator-reserved-types-history` | `feat(calm-hub): reserve decorator types, check decorator schemas and keep history` | `feat/3396-04-decorators-tab-registry` |
| 06 | `feat/3396-06-extension-manifest-registry` | `feat(calm-hub): load extension manifests and list them at /api/calm/extensions` | `feat/3396-05-decorator-reserved-types-history` |
| 07 | `feat/3396-07-decorator-overlays` | `feat(calm-hub-ui): draw decorator overlays and show deployments as a decorator view` | `feat/3396-06-extension-manifest-registry` |
| 08 | `feat/3396-08-extension-identity-assertion` | `feat(calm-hub): sign an identity assertion for extensions and publish a JWKS` | `feat/3396-07-decorator-overlays` |
| 09 | `feat/3396-09-extension-route-proxy` | `feat(calm-hub): proxy extension routes with a signed identity assertion` | `feat/3396-08-extension-identity-assertion` |
| 10 | `feat/3396-10-extension-blocks-ui` | `feat(calm-hub-ui): render Tier 1 extension blocks` | `feat/3396-09-extension-route-proxy` |
| 11 | `feat/3396-11-registry-decorator-views` | `feat(calm-hub-ui): load decorator views from the extension registry` | `feat/3396-10-extension-blocks-ui` |
| 12 | `feat/3396-12-cli-extension-commands` | `feat(cli): add hub extension commands` | `feat/3396-11-registry-decorator-views` |
| 13 | `feat/3396-13-linear-time-input-patterns` | `feat(calm-hub): check extension command input patterns in linear time` | `feat/3396-12-cli-extension-commands` |
| 14 | `feat/3396-14-extension-mcp-tools` | `feat(calm-hub): add MCP tools for extension commands` | `feat/3396-13-linear-time-input-patterns` |
| 15 | `feat/3396-15-extension-ui-placement` | `feat(calm-hub-ui): give extension contributions one place each in the UI` | `feat/3396-14-extension-mcp-tools` |
| 16 | `feat/3396-16-overlay-toggles` | `feat(calm-hub-ui): toggle decorator overlays per extension` | `feat/3396-15-extension-ui-placement` |
| 17 | `feat/3396-17-release-tracker-demo` | `chore(calm-hub): add a release-tracker demo extension` | `feat/3396-16-overlay-toggles` |
| 18 | `feat/3396-18-hub-decorator-timestamps` | `feat(calm-hub)!: set decorator timestamps in Hub` | `feat/3396-17-release-tracker-demo` |
| 19 | `feat/3396-19-extension-docs-tutorial` | `docs: add CALM Hub extension guides and tutorial` | `feat/3396-18-hub-decorator-timestamps` |
