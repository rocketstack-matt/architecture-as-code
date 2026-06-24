# CALM Hub — UX review assets

Screenshots and analysis from a Playwright-driven walkthrough of CALM Hub running locally in
standalone mode (NitriteDB), seeded with the demo namespaces (TraderX, AI-governance controls,
timeline-demo, etc.). Captured at desktop **1440×900** and mobile **390×844**.

- **`UX-REVIEW.md`** — the written review (Desktop + Mobile sections).
- **`DESIGN-PROMPT.md`** — prompt to paste into the Claude.ai designer to continue the work.

## Screenshot index

### Desktop (1440×900)
| File | Screen / what it shows |
|------|------------------------|
| `desktop-01-landing.png` | Hub landing — empty grey canvas, no first-run state |
| `desktop-02-architecture-doc.png` | Architecture Diagram view (TraderX) — note oversized blue minimap |
| `desktop-03-node-drawer.png` | Node detail drawer open (three-pane layout) |
| `desktop-04-json.png` | JSON tab (line numbers, syntax highlight, schema link) |
| `desktop-05-deployments.png` | Deployments tab — empty state |
| `desktop-06-control-detail.png` | Control detail (AI-governance control domain) |
| `desktop-07-visualizer.png` | Standalone Visualizer file-upload dropzone |
| `desktop-08-admin.png` | Admin / Access Management (black-pill active tab) |
| `desktop-09-search.png` | Global search typeahead (duplicate results, no disambiguator) |
| `desktop-10-pattern-detail.png` | Pattern detail — minimap renders correctly when nodes are spread |
| `issue-tree-long-and-empty.png` | **Long tree** after expanding one namespace; stale main panel |

### Mobile (390×844)
| File | Screen / what it shows |
|------|------------------------|
| `mobile-01-landing.png` | Full-screen Explore overlay |
| `mobile-02-namespaces.png` | Drill-down namespace list |
| `mobile-03-diagram.png` | Diagram **does not fit-to-view** — overflows off-screen |
| `mobile-03b-diagram-full.png` | Full-page capture confirming no scroll/fit |
| `mobile-04-view-options.png` | "View options" sheet (tabs/search/timeline behind eye icon) |
| `mobile-05-json.png` | JSON wraps cleanly |
| `mobile-06-admin.png` | Admin reflow (top tab bar, stacked forms) |
| `mobile-07-node-detail.png` | Node detail full-screen takeover |

### Version-navigator verification
| File | What it shows |
|------|---------------|
| `verify-json-timeline-v1.png` | timeline-demo JSON at v1.0.0 (2 nodes) |
| `verify-json-timeline-v3.png` | Same item at v3.0.0 after clicking a Timeline moment (more nodes) — proves the Timeline drives the JSON view, not just the diagram |
