---
id: calm-hub-mcp-api
title: MCP & API Reference
sidebar_label: MCP & API Reference
sidebar_position: 2
---

# CALM Hub — MCP & API Reference

CALM Hub exposes two API surfaces:

1. **REST API** - the primary interface, fully documented via OpenAPI/Swagger UI.
2. **MCP server** - an experimental [Model Context Protocol](https://modelcontextprotocol.io) endpoint for AI-agent integrations.

---

## REST API

### OpenAPI Specification

CALM Hub uses [SmallRye OpenAPI](https://quarkus.io/guides/openapi-swaggerui) (Quarkus extension) to auto-generate an OpenAPI 3 specification from the JAX-RS resource annotations. The spec reflects the live configuration of the running instance (all endpoints, request/response schemas, security scopes).

| Endpoint | Description |
|:---------|:------------|
| `/q/openapi` | OpenAPI 3 specification (YAML) |
| `/q/openapi?format=json` | OpenAPI 3 specification (JSON) |
| `/q/swagger-ui` | Interactive Swagger UI explorer |

The Swagger UI is always included in the image (`quarkus.swagger-ui.always-include=true`), so it is available in production as well as development.

### Base URL

CALM Hub exposes two REST surfaces:

**Numeric-id storage API** — `/api/calm/...`

The primary CRUD interface for namespaces, architectures, patterns, flows, standards, and other artefacts. Resources are addressed by server-assigned numeric IDs.

```
GET    /api/calm/namespaces
POST   /api/calm/namespaces
GET    /api/calm/namespaces/{namespace}/architectures
POST   /api/calm/namespaces/{namespace}/architectures
GET    /api/calm/namespaces/{namespace}/architectures/{id}/versions/{version}
```

**Name-based API** — `/calm/...`

A user-facing layer that maps human-readable names (slugs) to their numeric IDs and provides versioned access by name. All paths include a `/versions/` segment.

```
POST /calm/namespaces/{namespace}/architectures/{name}/versions/{version}
GET  /calm/namespaces/{namespace}/architectures/{name}/versions
GET  /calm/namespaces/{namespace}/architectures/{name}/versions/{version}
GET  /calm/namespaces/{namespace}/architectures
```

The type segment is not case-sensitive in a request, so `Architectures` and `architectures` name the same resource. This also applies to the type segment in a `$id` that you send. CALM Hub always writes the type segment in lowercase, in the `$id` of a returned document and in the `Location` header. The CALM CLI reads only the lowercase form.

The full endpoint list with request/response schemas is visible in the Swagger UI at `/q/swagger-ui`.

### Finding the architectures that implement a pattern

```
GET /calm/namespaces/{namespace}/patterns/{name}/versions/{version}/implementations
```

Use this before you change a pattern. It shows which architectures depend on the version you are about to change.

```jsonc
{
  "pattern": { "namespace": "finos", "name": "api-gateway", "version": "1.0.0" },
  "implementations": [
    { "namespace": "finos", "architectureId": 7, "version": "1.2.0", "customId": "trade-capture" }
  ]
}
```

An architecture names its pattern in its own `$schema`, which `calm generate` sets to the pattern's `$id`.

| | |
|---|---|
| Version | A release such as `1.0.0`, or a snapshot such as `1.0.0-SNAPSHOT`. A version that does not exist returns `404`, not an empty list. |
| Host | Only the path of the `$schema` is compared, so references keep working after the hub moves. |
| Order | Sorted by namespace, then `architectureId`, then architecture version, so `1.2.0` comes before `1.10.0`. |
| Paging | `limit` and `offset` are optional. Omit them and you get every match — the endpoint never shortens a list you did not ask to shorten. An `offset` without a `limit` returns every match after the offset. |
| `customId` | The name on the name-based API. Omitted for an architecture created through the numeric-id API, which never had one; use `architectureId` for those. |
| GitHub mode | Not available. The endpoint returns `501`. |

The hub answers on demand and caches nothing, reading the architectures you are allowed to see. See [ADR 0008](https://github.com/finos/architecture-as-code/blob/main/calm-hub/decisions/0008-pattern-implementations-read-the-architecture-schema.md) for why the link is resolved at request time rather than stored.

### Snapshot Versions

A version ending in `-SNAPSHOT` (e.g. `1.0.0-SNAPSHOT`) is mutable — it can be re-posted with new content. A release version (e.g. `1.0.0`) is immutable once created. Publishing a release deletes the matching snapshot, if one exists. Snapshots are supported on architectures, patterns, flows, standards, and interfaces only.

| Request | Effect | Status |
|:--------|:-------|:-------|
| `POST .../versions/1.0.0-SNAPSHOT` (first time) | Creates the snapshot | `201` |
| `POST .../versions/1.0.0-SNAPSHOT` (again) | Replaces the snapshot's content | `200` |
| `POST .../versions/1.0.0` | Publishes the release, deletes `1.0.0-SNAPSHOT` | `201` |

A snapshot cannot be created if its release version is already published — CALM Hub returns `409 Conflict`.

Snapshots are written through the name-based `/calm/...` API only. The numeric `/api/calm/...` write endpoints reject a `-SNAPSHOT` version; their `GET` endpoints can read one.

### Decorator Write Rules

The decorator endpoints (`/api/calm/namespaces/{namespace}/decorators`) and the MCP decorator tools apply the same rules on write.

| Rule | When | Status |
|:-----|:-----|:-------|
| Reserved type | The old or new decorator `type` is reserved, and the caller is not one of its writers. Applies to create, update and delete | `403` |
| Schema check | The decorator `$schema` is one that Hub knows, and the decorator does not match it. The body lists each error with its `location` (a JSON Pointer) | `400` |

Hub knows the calm-schema decorator Standards that it bundles (`deployment`, `kubernetes`, `control-evaluation`) and the base decorator definition (`https://calm.finos.org/release/<version>/meta/decorators.json#/defs/decorator`). Hub accepts a decorator with any other `$schema` without a check.

No type is reserved by default. Reserve a type in `application.properties`:

```properties
calm.decorators.reserved."validation".writers=system
calm.decorators.reserved."control-evaluation".writers=policy-engine
```

A writer is a principal name, the same name that the audit log records for the caller.

A reserved type is also append-only. An update of a reserved-type decorator does not change it. Hub stores a new decorator that supersedes the old one, returns `201` with the new `id` and a `Location` header, and keeps the old one. Hub stores the link in its own storage fields, not in the decorator `data`. Other types keep the in-place update (`200`).

| Request | Effect |
|:--------|:-------|
| `GET .../decorators`, `GET .../decorators/values` | Lists only current decorators |
| `GET .../decorators/{id}` | Returns the decorator, current or superseded |
| `GET .../decorators/{id}/history` | Returns the history that contains `{id}`, current first. Each entry has `id`, `supersedes`, `supersededBy` and `decorator` |
| `PUT .../decorators/{id}` on a superseded decorator | `409 Conflict`. Update the current decorator |
| `DELETE .../decorators/{id}` | Deletes the whole history. The caller must be a writer for every reserved type in it |

The MCP tool `getDecoratorHistory` returns the same history.

### Access Control

Endpoints are protected by **per-namespace permissions**. Access is granted via `UserAccess` records stored in the active backend; each record ties a username to a permission level for a specific namespace or control domain.

| Permission | Scope | What it grants |
|:-----------|:------|:---------------|
| `read` | namespace | Read artefacts in a namespace |
| `write` | namespace | Read + write artefacts (implies `read`) |
| `admin` | namespace | Read + write + manage access grants (implies `write`) |
| `domain_read` | control domain | Read controls in a domain |
| `domain_write` | control domain | Write controls in a domain |
| `global_admin` | all namespaces | Bypasses all namespace permission checks (`admin` on the reserved `GLOBAL` namespace) |

Namespace permissions follow a hierarchical model using `.` as a separator (`org`, `org.team`, `org.team.project`). `read` is AND-ed across the ancestor chain (every level must have a matching grant); `write` and `admin` cascade from any ancestor via OR. See [`calm-hub/PERMISSIONS.md`](https://github.com/finos/architecture-as-code/blob/main/calm-hub/PERMISSIONS.md) and the [entitlements guide](../working-with-calm/calm-hub-entitlements.md) for the full model.

When running without the `secure` Quarkus profile, authentication is disabled and all endpoints are accessible without a token.

---

## MCP Server

:::caution Experimental
The MCP server is **disabled by default** and is currently experimental. The API surface may change between releases.
:::

### What Is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) (MCP) is an open standard for connecting AI language models to external tools and data sources. CALM Hub's MCP server exposes its artefact store as a set of callable *tools* that an LLM can invoke to query architectures, patterns, controls, and more.

### Enabling the MCP Server

```properties
# application.properties  (or pass as env var)
calm.mcp.enabled=true
```

```bash
# Via environment variable
export CALM_MCP_ENABLED=true
../mvnw quarkus:dev
```

The MCP endpoint is always registered at `/mcp` (HTTP Streamable transport). The `calm.mcp.enabled` flag gates whether the tool handlers are active — with it set to `false` the endpoint is reachable but all tool calls return a disabled response.

### Endpoint

```
POST /mcp
Content-Type: application/json
```

CALM Hub uses the **HTTP Streamable** MCP transport (Quarkiverse `quarkus-mcp-server-http`, version 1.12.1). This transport uses JSON-RPC 2.0 over HTTP POST.

### Available Tools

| Tool provider | Example tools |
|:--------------|:-------------|
| `ArchitectureTools` | `list_architectures`, `get_architecture` |
| `PatternTools` | `list_patterns`, `get_pattern` |
| `ControlTools` | `list_controls`, `get_control` |
| `DomainTools` | `list_domains`, `create_domain` |
| `InterfaceTools` | `list_interfaces`, `get_interface` |
| `NamespaceTools` | `list_namespaces`, `create_namespace` |
| `SearchTools` | `search_architectures` |
| `StandardTools` | `list_standards` |
| `TimelineTools` | `get_timeline` |
| `AdrTools` | `list_adrs`, `get_adr` |

To retrieve the full tool list from a running instance:

```bash
curl -s -X POST http://localhost:8080/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | jq '.result.tools[].name'
```

### Extension Tools

CALM Hub makes one tool for each command of an enabled [extension](index.md#extensions) when `calm.mcp.enabled` is true. The tool name is `ext_<id>_<command>`, for example `ext_example-services_list-services`. These tools come after the built-in tools in `tools/list`, sorted by name.

- The input and output schemas come from the manifest. CALM Hub checks the arguments against the input schema before it calls the extension.
- One schema that a client cannot compile makes TypeScript MCP SDK clients lose every tool. Thus each input and output schema must use this subset of JSON Schema 2020-12:

  | Rule | Supported | Refused |
  |---|---|---|
  | Dialect | 2020-12, with or without `$schema` | Other `$schema` values, for example draft-07 |
  | Subschemas | Objects and booleans | Other values, for example `"properties": {"limit": "integer"}` |
  | `$ref` | A local JSON Pointer: `#`, `#/$defs/name`, `#/properties/name`. It must point to a subschema, and not only to a loop of `$ref`s | Remote refs (CALM Hub and MCP clients do not fetch them), `#anchor` refs |
  | Identifiers | None | `$id`, `$anchor`, `$dynamicAnchor`, `$dynamicRef` anywhere in the schema |
  | `pattern`, `patternProperties` keys | Regular expressions that are valid in both ECMA-262 (with the `u` flag) and Java. At most 1000 characters, and groups nested at most 64 deep | Java-only syntax, for example `(?i)abc`, `a++` or `\A`. ECMA-only syntax, for example `(?<first_name>…)` (Java group names have only letters and digits) or `\u{5A}` (use `\u005A`). Also `(?i:…)` modifiers and `&&` in a class, which older clients or Java read differently |

  A command with a schema outside this subset gets no tool. CALM Hub logs a warning that names the extension, the command, the schema and the location of the error. For a schema that is not valid 2020-12, this is the deepest error, which names the value to fix.
- If CALM Hub cannot load the JSON Schema 2020-12 meta-schema, it makes no extension tools and logs an error.
- MCP requires an output schema of type `object`. CALM Hub wraps any other output schema as `{"type": "object", "properties": {"result": <schema>}, "required": ["result"]}`, and returns the reply as `{"result": <reply>}`. The wrapped schema gets a CALM Hub `$id`, so that its `$ref`s still point into it.
- MCP servers and clients need an object for each property schema. CALM Hub publishes a boolean subschema as `{}` (`true`) or `{"not": {}}` (`false`). `additionalProperties` and `unevaluatedProperties` stay booleans.
- A command that CALM Hub cannot make a tool for gets no tool, and CALM Hub logs a warning. An extension never stops CALM Hub from starting.
- `readOnlyHint` is true for a `GET` or `readOnly` route. `destructiveHint` and `idempotentHint` come from the command. With no hint, a write is destructive and not idempotent.
- Each call goes through the extension proxy, with the same scope, read-only, audit and size rules as a REST call. CALM Hub checks the scope when the tool is called. A user sees every tool, also one that they cannot call.
- A read-only CALM Hub makes no tool for a command whose route it cannot run.
- Arguments that fill a `{param}` go in the path, percent-encoded, with the same path checks as a REST call. A value such as `%61dmin` or `a/../b` is refused. The rest go to the query for `GET` and `DELETE`, and to the JSON body for other methods.
- A `2xx` reply is the result: structured content and the same JSON as text if the command has an output schema, otherwise text. Any other reply is a tool error.

### Example Tool Call

```bash
# List all namespaces via MCP
curl -s -X POST http://localhost:8080/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_namespaces",
      "arguments": {}
    }
  }'
```

### Testing with Quarkus Dev UI

When running in `quarkus:dev` mode with `%dev.quarkus.mcp.server.traffic-logging=true`, all JSON-RPC messages are printed to the console. The [Quarkus Dev UI](http://localhost:8080/q/dev) also ships an interactive MCP tester.

### Connecting an AI Client

Any MCP-compatible AI client (e.g. Claude Desktop, Cursor, VS Code with an MCP extension) can connect to CALM Hub by adding it as an HTTP MCP server pointing at `http://<host>:8080/mcp`.

Example `mcp.json` entry for Claude Desktop or a compatible client:

```json
{
  "mcpServers": {
    "calm-hub": {
      "url": "http://localhost:8080/mcp",
      "transport": "http"
    }
  }
}
```

---

## Further Reading

- [Overview & runtimes](./index.md) - feature summary, image variants, read-only mode
- [Developer Guide](./developer-guide.md) - test pyramid, storage extension points
- [UI Walkthrough](../working-with-calm/calm-hub.md) - visual interface guide
