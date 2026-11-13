Title: fix(calm-hub): refuse MCP write tools on a read-only Hub
Branch: feat/3396-01-mcp-read-only-guard

## Description
Part 1 of 19 of #3396. Based on `main`.

MCP is served by Vert.x routes, not JAX-RS, so `ReadOnlyRequestFilter` never sees it. A read-only Hub ran the MCP write tools.

This PR puts `@ReadOnlyHubGuard` on each MCP tool class. On a read-only Hub, its interceptor refuses each tool that needs more than a read scope, and the tool returns an error. The check runs before the permission check, so a caller without the scope also gets the read-only error.

`TestMcpToolsReadOnlyShould` calls every MCP tool bean, so a new tool class that changes data and has no guard fails the test. `McpTestClient` is a small MCP client for tests; PR 14 uses it again.

## Type of Change
- [x] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
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
`fix(calm-hub): refuse MCP write tools on a read-only Hub`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 3882 Java tests, 0 failures, 0 errors, 2 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe. The MongoDB suites use a `mongo:4.4.3` container. The 17 Nitrite suites also run on MongoDB here, because of the test bug that PR 3 fixes.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
