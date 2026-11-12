## Draft PR bodies

Each body uses `.github/pull_request_template.md`. The Type and Component lists show only the ticked lines plus the unticked ones a reviewer would look for; paste the full template lists when opening the PR.

### P07 `feat(calm-hub-ui): draw decorator overlays and show deployments as a decorator view`

```markdown
## Description
Part of #3396. Stacked on P06.

One overlay engine draws decorators on the diagram from `decorator-views` entries. Each node or relationship gets a badge with its status (ok, warn, error, info), and an error or a warning also colours the element. Control evaluations and deployments are the two built-in views. They are bundled in the UI for now; a later PR loads them from the extension registry.

- The Deployments tab and its panel are removed. `?tab=deployments` now opens the Decorators tab filtered to `deployment`.
- The legend lists each view on screen, with counts by status and a toggle. **View all** opens the Decorators tab filtered to the view's type and `$schema`, and moves focus to it. Below 1024 px the legend starts closed.
- The details drawer gets the containment map, so a container lists each decorator that its badges count. Its list is now headed "All decorators", because a badge shows only the newest decorator of each key.
- Badges follow the diagram text size.

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Affected Components
- [x] CALM Hub UI (`calm-hub-ui/`)
- [x] Documentation (`docs/`)

## Commit Message Format ✅

## Testing
- [x] I have tested my changes locally (calm-hub-ui lint, vitest and build; docs build)
- [x] I have added/updated unit tests
- [x] All existing tests pass (calm-hub-ui: 2401 tests; this PR changes no other package)

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P08 `feat(calm-hub): sign an identity assertion for extensions and publish a JWKS`

```markdown
## Description
Part of #3396. Stacked on P07.

Hub can sign a short-lived JWT (`typ: calm-ext+jwt`) that tells an extension backend who calls it. The public keys are at `GET /api/calm/auth/jwks`, which is public.

- The signer uses the JDK, not a JWT library. It takes an RSA (2048 bits or more) or P-256 key; a shared secret is refused.
- A bearer token with `typ: calm-ext+jwt` is refused in every auth mode, so an extension cannot replay an assertion to Hub. The mechanism sends the 401 itself, so an OIDC provider that is down cannot make it a 500.
- Settings: `calm.extensions.identity.private-key-location`, `public-key-locations` (key rotation) and `ttl-seconds`.

Gotchas:
- Hub now refuses to start with an enabled extension that has routes and no signing key. Nothing signs yet: the proxy (next PR) calls `sign()`.
- The "Try it" command in `calm-hub/AGENTS.md` loads the example extension, which has routes, so it needs keys from this PR on. The next PR replaces it with the example-services README.

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] Documentation (`docs/`)

## Commit Message Format ✅

## Testing
- [x] I have tested my changes locally (docs build only)
- [x] I have added/updated unit tests
- [ ] All existing tests pass

[Java: runner results to be added by the controller]

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P09 `feat(calm-hub): proxy extension routes with a signed identity assertion`

```markdown
## Description
Part of #3396. Stacked on P08.

`/api/calm/extensions/{id}/api/{route path}` calls the extension backend for a route that the manifest declares. Hub sends the signed identity assertion and the caller's context.

- Hub checks the route scope, the resource permission and read-only mode before the call. A read-only Hub lets through only the routes marked `readOnly`.
- Request and response size, and connect and read time, have limits (global and per extension). A redirect, a 401, 407 or 5xx reply, or a content type that Hub does not pass on, becomes a generic `502`; a timeout is `504`.
- Each call is audited. The audit enums add `READ`, `EXTENSION`, `FAILURE` and `UNKNOWN`; `developer-guide.md` says what a rollback must do with these rows.
- A path value with an encoded `/` (`%2F`) or another part that ADR 0011 refuses is refused (`ExtensionPaths`). `path-values.json` holds the values that each client must refuse in the same way.
- `local-dev/extensions/example-services` is an example backend that checks the assertion.

Gotchas:
- Hub now refuses a `POST` (or other write) with no JSON `Content-Type` (`415`). The CLI sends one only from P12. This is safe: no released client calls extension routes.
- Some text names the MCP tools, which use the proxy only from P14.

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] Documentation (`docs/`)

## Commit Message Format ✅

## Testing
- [x] I have tested my changes locally (`node --test` on example-services: 5 of 5; docs build)
- [x] I have added/updated unit tests
- [ ] All existing tests pass

[Java: runner results to be added by the controller]

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P10 `feat(calm-hub-ui): render Tier 1 extension blocks`

```markdown
## Description
Part of #3396. Stacked on P09.

The UI loads the extension registry and shows each contribution from the JSON blocks that its route returns: markdown, key-value, stats, table, cards and links. Hub serves the blocks schema at `/api/calm/extensions/schema/0/blocks.schema.json`.

- A screen has its own page (`/extensions/:extensionId/:contributionId`), a designer tab is a diagram tab, a detail panel shows in the node details, and a landing card on the home page. An action is a button; a route that is not `readOnly` asks first in a dialog.
- Calls go through the Hub proxy with the resource context (`namespace`, `resource`, `resourceType`, `resourceId`, `version`, `selectedElement`). A path value that Hub would refuse is refused before the call.
- `ExtensionsProvider` owns one `ExtensionService` and retries a failed registry load with a backoff. A registry `401` opens the sign-in prompt; an extension failure stays in its slot.
- A link to an extension tab keeps the tab until the registry loads.

Gotcha: the placements in this PR (`ExtensionPoints.tsx`, `extension-tabs.tsx`) are simple. P15 replaces them with one Extensions tab, a menu group and home cards, which scale to many extensions.

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] CALM Hub UI (`calm-hub-ui/`)

## Commit Message Format ✅

## Testing
- [x] I have tested my changes locally (calm-hub-ui lint, vitest and build)
- [x] I have added/updated unit tests
- [ ] All existing tests pass

[Java: runner results to be added by the controller]

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P11 `feat(calm-hub-ui): load decorator views from the extension registry`

```markdown
## Description
Part of #3396. Stacked on P10.

The overlays now read their decorator views from `GET /api/calm/extensions`. Hub ships `control-evaluation` and `deployment` as built-in extensions on the classpath, so an operator can turn one off.

- If the registry cannot be loaded, the UI draws its bundled copy of the built-in views. A test keeps that copy the same as the manifests. When a retry loads the registry, the UI reads the views again.
- A manifest overlay can now declare `hide` (values to leave off), `key` and `time` (keep the newest entry of each key). The UI engine reads them since P07.
- The registry and the decorator views share one request.

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] CALM Hub UI (`calm-hub-ui/`)
- [x] Documentation (`docs/`)

## Commit Message Format ✅

## Testing
- [x] I have tested my changes locally (calm-hub-ui lint, vitest and build; docs build)
- [x] I have added/updated unit tests
- [ ] All existing tests pass

[Java: runner results to be added by the controller]

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P12 `feat(cli): add hub extension commands`

```markdown
## Description
Part of #3396. Stacked on P11.

- `calm hub extensions list` and `calm hub extensions describe` show the enabled extensions, their commands, routes and input schemas.
- `calm hub ext <id> <command> [--input <file|->] [--arg key=value]...` runs an extension command through the Hub proxy.

The shared client builds the request from the command's route. Input that matches a `{param}` fills the path; the rest goes to the query for `GET` and `DELETE`, and to the JSON body otherwise. It refuses, before the call, a path value that Hub would refuse and a value that makes the path match another route. CalmHub checks the route, the path and the scope, but not the input: the extension checks it. A write sends `Content-Type: application/json`, which Hub requires since P09.

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Affected Components
- [x] CLI (`cli/`)
- [x] Documentation (`docs/`)
- [x] Shared (`shared/`)

## Commit Message Format ✅

## Testing
- [x] I have tested my changes locally (`npm test` in every workspace; `shared` and `cli` lint; docs build)
- [x] I have added/updated unit tests
- [ ] All existing tests pass (5 `shared` e2e tests that fetch from calm.finos.org fail in the sandbox, also without this PR)

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [x] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

### P13 `feat(calm-hub): check extension command input patterns in linear time`

```markdown
## Description
Part of #3396. Stacked on P12.

`EcmaRegex` checks that a JSON Schema `pattern` is an ECMA-262 regular expression with the `u` flag, as MCP clients compile it. It also writes the pattern in RE2 syntax, so that Hub can match caller input in linear time with RE2J. A pattern with a lookaround, a back reference or a Unicode property has no RE2 form with the same meaning, so it is refused. Size and depth limits keep the parsers inside their stacks.

The class has no caller yet: the MCP extension tools use it in the next PR (P14). Adds `com.google.re2j:re2j` 1.8.

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Affected Components
- [x] CALM Hub (`calm-hub/`)
- [x] Dependencies

## Commit Message Format ✅

## Testing
- [ ] I have tested my changes locally
- [x] I have added/updated unit tests
- [ ] All existing tests pass

[Java: runner results to be added by the controller]

## Checklist
- [x] My commits follow the [conventional commit format](https://www.conventionalcommits.org/)
- [ ] I have updated documentation if necessary
- [x] I have added tests for my changes (if applicable)
- [x] My changes follow the project's coding standards
```

