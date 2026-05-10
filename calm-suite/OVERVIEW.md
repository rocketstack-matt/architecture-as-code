# `calm-suite/` Overview

Two sibling projects sit under `calm-suite/`. They are **independent of each other** (no cross-imports) and use different stacks/package managers from the rest of the monorepo. Both are CALM-native but solve different problems.

---

## 1. `calm-suite/calm-guard/` — Compliance / DevSecOps platform

Built for the **DTCC/FINOS Innovate.DTCC AI Hackathon (Feb 23–27, 2026)** — prototype-grade. Single Next.js 15 app (npm), React 19, Tailwind, shadcn/ui, Vercel AI SDK with 4 LLM providers (Gemini/Claude/GPT/Grok). Depends on `@finos/calm-cli ^1.33.0` (the published version of this repo's `cli/`).

### Components

| Area | Role |
|---|---|
| `src/lib/agents/` + `agents/*.yaml` | 6 LLM agents (architecture-analyzer, compliance-mapper, pipeline-generator, cloud-infra-generator, risk-scorer, calm-remediator) + orchestrator |
| `src/lib/calm/` | CALM v1.0/v1.1/v1.2 parser w/ legacy normalisation (`apigateway→service`, `uses→connects`); lenient validation |
| `src/lib/skills/` + `skills/*.md` | 8 markdown knowledge files (SOX, PCI-DSS, NIST-CSF, SOC2, FINOS-CCC, protocol/devsecops/cloud) injected into agent prompts |
| `src/lib/learning/` | Self-learning engine — fingerprints findings, auto-promotes to deterministic rules at 3 observations / 75% confidence |
| `src/lib/pipeline/` | GitHub Actions YAML generator (Semgrep/Gitleaks/Trivy/Syft) + Terraform IaC from CALM signals |
| `src/lib/github/` | Fetch CALM from repos, raise remediation/CI PRs |
| `src/components/` | React Flow architecture viewer, real-time SSE compliance dashboard, heat maps, Recharts |
| `docs/` | Standalone Docusaurus site |

---

## 2. `calm-suite/calm-studio/` — Visual CALM editor (pnpm monorepo, 7 packages)

SvelteKit 2 / Svelte 5 runes web app, optionally shelled in **Tauri 2** for desktop. **Uses pnpm workspaces** — distinct from the rest of the repo (npm).

### Sub-packages

| Package | Role |
|---|---|
| `apps/studio/` | SvelteKit visual editor: Svelte Flow canvas + ELK.js auto-layout + CodeMirror 6 JSON pane, bidirectional diagram↔code sync, undo/redo, clipboard, templates, search, properties panel |
| `packages/calm-core/` | TS types (`CalmArchitecture`, `CalmNode`, `CalmRelationship`, `CalmControl`…) + AJV validation + AIGF control catalogue |
| `packages/extensions/` | Node-type packs: core, fluxnova, ai, aws, gcp, azure, k8s |
| `packages/calmscript/` | DSL compiler (placeholder) |
| `packages/mcp-server/` | MCP server with 21 tools (architecture/node/relationship CRUD, validate, render, import/export); stdio + HTTP |
| `packages/web-component/` | Embeddable `<calmstudio-diagram>` (ES + IIFE) |
| `packages/vscode-extension/` | VS Code extension: diagram preview + MCP wiring |
| `packages/github-action/` | Renders CALM as SVG in PR comments |
| `docs-site/` | Docusaurus site |

---

## Overlap with existing monorepo projects

| Existing project | Overlap inside `calm-suite/` | Notes |
|---|---|---|
| **`calm-models/`** (shared TS types) | `calm-studio/packages/calm-core` redefines `CalmArchitecture` / `CalmNode` / `CalmRelationship` etc. | Studio doesn't depend on `calm-models` — types diverge. Risk of drift. |
| **`shared/`** (AJV + Spectral validation) | calm-core has its own AJV validator; calm-guard ships a separate "lenient" parser/validator | Three independent validation paths now. |
| **`cli/`** (`@finos/calm-cli`) | calm-guard *consumes* it (v1.33.0); calm-studio *bypasses* it | Studio reimplements parsing/validation; guard is properly aligned. |
| **`calm-hub/`** (Java/Quarkus REST + MCP backend) | `calm-studio/packages/mcp-server` is a separate MCP surface (Node/stdio/HTTP) | Two MCP servers in the same repo — different transports, different tool sets. |
| **`calm-hub-ui/`** (React + ReactFlow read-only viewer) | `calm-studio/apps/studio` is an editable Svelte + Svelte Flow canvas | Different frameworks → no code share. UI capabilities partly overlap (graph view, search, properties). |
| **`calm-plugins/vscode/`** (live preview, validation, tree, docify) | `calm-studio/packages/vscode-extension` (canvas preview + MCP) | **Direct overlap** — two VS Code extensions for CALM in one repo. |
| **`calm-widgets/`** (Handlebars widgets, Mermaid diagrams, docify) | `calm-studio/packages/web-component` (embeddable Svelte diagram) | Different rendering models but both target "embed a diagram somewhere". |
| **`calm-ai/`** (prompts + config for Copilot/Claude/Codex) | calm-guard's full multi-agent runtime (Vercel AI SDK) | Different scope — `calm-ai` is config; guard is a hosted agent runtime. No shared assets. |
| **`docs/`** (calm.finos.org Docusaurus) | calm-guard `docs/` and calm-studio `docs-site/` are *additional* Docusaurus sites | Three docs sites in the repo. |
| **`calm/`** (schema governance) + **`calm-server/`** (validation REST) | No counterpart in suite — guard doesn't publish a validation API; studio validates client-side | — |

### New capabilities `calm-suite/` introduces (no existing equivalent)

- CI/CD pipeline generation (`calm-guard/src/lib/pipeline/`)
- Compliance framework mapping with regulatory skill files (SOX/PCI/NIST/SOC2/FINOS-CCC)
- Multi-agent LLM orchestration with SSE streaming
- Self-learning pattern extraction
- **Editable** architecture canvas (ELK.js, sub-flow containment for `deployed-in`/`composed-of`)
- Tauri desktop shell
- GitHub Action that renders CALM as SVG in PR comments
- Embeddable web component for diagrams

---

## Things worth flagging

1. **Type duplication** — `calm-studio/packages/calm-core` reinvents `calm-models`. Either consume `calm-models` or this should be the canonical successor; right now both will drift.
2. **Two VS Code extensions** in one monorepo (`calm-plugins/vscode` vs `calm-studio/packages/vscode-extension`) — naming/positioning isn't clear from READMEs.
3. **Two MCP servers** (`calm-hub` Java endpoint vs `calm-studio/packages/mcp-server` Node) — likely intentional, but worth a written boundary.
4. **pnpm vs npm** — `calm-studio` uses pnpm workspaces and has its own `pnpm-lock.yaml` (681 KB). The rest of the monorepo is npm. CI and Renovate/Dependabot config will need to handle both.
5. **Three Docusaurus sites** plus the canonical `docs/`.
6. **calm-guard's lenient parser** silently rewrites legacy CALM types — fine for analysis, but it's a second source of CALM semantics outside `shared/` and `cli/`.
