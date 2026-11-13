Title: feat(calm-hub): check extension command input patterns in linear time
Branch: feat/3396-13-linear-time-input-patterns

## Description
Part 13 of 19 of #3396. Based on [PR 12] (merge that first).

`EcmaRegex` checks that a JSON Schema `pattern` is an ECMA-262 regular expression with the `u` flag, as MCP clients compile it. It also writes the pattern in RE2 syntax, so that Hub can match caller input in linear time with RE2J. A pattern with a lookaround, a back reference or a Unicode property has no RE2 form with the same meaning, so it is refused. Size and depth limits keep the parsers inside their stacks.

Not yet: the class has no caller. The MCP extension tools use it in PR 14.

Dependency: `com.google.re2j:re2j` 1.8.

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
- [ ] Documentation (`docs/`)
- [ ] Shared (`shared/`)
- [ ] VS Code Extension (`calm-plugins/vscode/`)
- [x] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`feat(calm-hub): check extension command input patterns in linear time`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4586 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- The `shared` and `cli` tests pass, and the cli builds.
- The `node --test` suites in `calm-hub/local-dev` pass.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [ ] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
