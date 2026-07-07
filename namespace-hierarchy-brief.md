# Design brief — namespace hierarchy in the CALM Hub Explore rail

## Context
The CALM Hub UX redesign (epic finos/architecture-as-code#2754, PRs #2761–#2766, now merged)
replaced the old desktop **Explore tree** with a flat, one-level **Explore rail**
(`calm-hub-ui/src/hub/components/explore-rail/ExploreRail.tsx`): a searchable list of
NAMESPACES (with total artefact counts) above a list of CONTROL DOMAINS (with control counts).

## The problem (raised by Mark Scott on #2754)
> "how do the hierarchy of namespaces get represented? Still nested? … [these] are no longer
> nested … finos.calm and finos.traderx are not 'beneath' finos, which may become unwieldy in a
> large enterprise."

CALM namespaces are **dot-delimited** identifiers. In the seeded data:

| Namespace        | Total | Note |
|------------------|-------|------|
| `finos`          | 10    | has its own artefacts AND is the parent prefix of the two below |
| `finos.calm`     | 5     | child of `finos` |
| `finos.traderx`  | 3     | child of `finos` |
| `workshop`       | 13    | top-level |
| `traderx`        | 6     | top-level (distinct from `finos.traderx`) |
| `ai-governance-v2` | 2   | top-level |
| `timeline-demo`  | 6     | top-level |

Rendered flat, `finos`, `finos.calm`, `finos.traderx` sit as siblings. At enterprise scale
(hundreds of namespaces, several dot-levels deep) the flat list becomes unwieldy and loses the
"these belong together" grouping the old tree afforded.

## What we want from you (Claude Design)
Propose one or more visual/interaction designs for representing the namespace **hierarchy** in the
Explore rail, that scale to a large enterprise. Consider trade-offs and produce mockups.

## Hard constraints (from the current implementation)
1. **Hierarchy is derived from the dot-delimited name** — there is no separate parent field.
   `finos.calm` nests under `finos`; `a.b.c` nests under `a.b` under `a`.
2. **A prefix can be both a parent and a leaf.** `finos` has its own 10 artefacts *and* children.
   The design must let a user open `finos`'s own page while also expanding its children.
3. **Counts must stay visible.** Today each row shows the namespace's own total. Decide whether a
   parent shows own-count, a rolled-up subtree count, or both — and make it unambiguous.
4. **Search/filter must still work.** There's a "Filter namespaces" box; filtering a tree should
   surface matches at any depth (e.g. auto-expand ancestors of a match).
5. **Active-row highlight is URL-derived** (`/namespace/:ns`), so selection must map cleanly to a
   single row even in a nested view.
6. **CONTROL DOMAINS is a separate section below** and stays flat — out of scope, keep as-is.
7. Rail width is fixed and fairly narrow (see `redesignTokens.rail.width`); deep indentation must
   degrade gracefully (indent guides, truncation of the shared prefix, etc.).
8. It should also work collapsed/expanded and (ideally) hint at a mobile equivalent — the rail
   becomes a drawer on mobile.

## Option space to react to (seed — refine or replace)
- **A. Collapsible dot-prefix tree.** Group rows by dot segments; parent rows are expandable with a
  chevron and indentation; show the parent's own count and a subtle rolled-up count. Closest to the
  old tree; most familiar but can get deep/narrow.
- **B. Indented grouping, no collapse.** Keep a flat scroll but insert lightweight group affordances
  (top-level label + indented children, prefix elided on children so `finos.calm` reads as `.calm`
  under a `finos` header). Lighter weight, less clicking, but long groups still scroll.
- **C. Drill-down / breadcrumb.** Top level shows only root namespaces with subtree counts; clicking
  one replaces the list with its children + a breadcrumb back. Scales best for very wide/deep trees
  but adds navigation steps.
- **D. Hybrid** — tree by default with a search that flattens to matches.

Show at least the recommended option as a mockup at the real rail width, plus the expanded/collapsed
and searching states, and note how counts and the parent-is-also-a-leaf case are handled.

## Reference
- Current component: `calm-hub-ui/src/hub/components/explore-rail/ExploreRail.tsx` (+ `RailItem.tsx`,
  `RailSectionLabel.tsx`, `CountBadge.tsx`).
- Current-state screenshot: `current-state-flat-rail.png` (in this branch) — the flat rail is on the left.
- Issue thread: finos/architecture-as-code#2754.
