Title: feat(calm-hub): reserve decorator types, check decorator schemas and keep history
Branch: feat/3396-05-decorator-reserved-types-history

## Description
Part 5 of 19 of #3396. Based on [PR 4] (merge that first).

**Reserved types.** An operator can reserve a decorator type for named principals (`calm.decorators.reserved."<type>".writers`). Any other caller gets 403 from REST and a tool error from MCP. Hub logs the reserved types at startup. A reserved type is append-only: an update stores a new decorator that supersedes the old one, returns 201 with the new id and a `Location`, and keeps the old one. `GET .../decorators/{id}/history` and the MCP tool `getDecoratorHistory` return the history, current first. Lists return only current decorators. A superseding `PUT` gives an `UPDATE` and a `CREATE` audit entry.

**Write rules.** REST and MCP writes now go through `DecoratorWriteService`:

| Rule | Status |
|---|---|
| Body over 1 MiB of UTF-8 | 413 |
| `$schema`, `unique-id`, `type` not a string, or `target`, `target-type`, `applies-to` not an array of strings | 400 (fixed message; it does not echo the body) |
| Reserved type, caller not a writer | 403 |
| The decorator does not match a `$schema` that Hub bundles (deployment, kubernetes, control-evaluation, base decorator) | 400, at most 20 errors and `moreErrors` |
| A key that the store cannot keep | 400 |

Delete needs `global_admin` (as before), deletes the whole history, and gives 409 if another write supersedes the decorator first. In GitHub mode, delete gives 501 before it reads the history.

**Stores.** MongoDB stores the decorator as Hub checked it (a key such as `$numberInt` stays data; a large integer keeps up to 34 digits), and maps write failures to the storage errors. MongoDB refuses a key with a NUL character. [Nitrite dotted keys: owner decision pending]

Deliberate differences from ADR 0017 (#3581): no built-in `validation` type or `system` flag; a `PUT` supersedes the decorator it names (201), not the one with the same data key; the schema check runs in Hub with vertx-json-schema, not through calm-server; decorators stay in one document per namespace (#3639 is not done), so at 16 MB a write gives 413.

Not yet: Hub-owned times, and the refusal of Hub-owned fields in a write body. PR 18 adds both.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [x] ✨ New feature (non-breaking change which adds functionality)
- [x] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [ ] 🔧 Chore (maintenance, dependencies, CI, etc.)

💥 because the decorator write API refuses bodies that it accepted before (wrong field types, over 1 MiB, a schema mismatch, keys the store cannot keep), a `PUT` of a reserved type returns 201 and a new id, and `DELETE` removes the whole history. The 400 for invalid JSON no longer echoes the parser message.

Dependency: `io.vertx:vertx-json-schema`, version from the Quarkus BOM.

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
- [x] Dependencies
- [ ] CI/CD

## Commit Message Format ✅
`feat(calm-hub): reserve decorator types, check decorator schemas and keep history`

## Testing
- [x] I have tested my changes locally
- [x] I have added/updated unit tests
- [x] All existing tests pass

Results of a full run on a Linux runner at this commit:

- `mvnw clean verify -Pserver-only`: 4075 Java tests, 0 failures, 0 errors, 8 skipped.
- calm-hub-ui: lint, `vitest run` and the build pass.
- The docs build passes, with no broken links.
- `mvnw -P integration verify` passes. At this commit the profile runs the 47 `*Integration` classes with failsafe: the MongoDB suites on a `mongo:5.0` container, and the 17 Nitrite suites on Nitrite.

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
