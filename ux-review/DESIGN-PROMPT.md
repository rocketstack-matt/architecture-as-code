# Design-tool prompt — CALM Hub UX redesign

> Paste this into the Claude.ai designer. Attach (or point it at) the screenshots in this
> branch: `desktop-01…10`, `mobile-01…07`, `verify-json-timeline-v1/v3`,
> `issue-tree-long-and-empty`. The numbered list in README.md says what each one shows.

---

You are a senior product designer. I want you to continue a UX analysis of **CALM Hub** and
produce concrete redesign concepts (desktop and mobile) for its information architecture and
key layouts.

## What CALM Hub is
CALM Hub is the web UI for FINOS **CALM** (Common Architecture Language Model) — a JSON-based
language for describing software architectures. The Hub lets architects browse a catalogue of
versioned architecture artefacts and visualise them as node-and-edge diagrams. It's a
desktop-first, information-dense tool (think "GitHub-for-architectures") built in React 19 +
Vite + TailwindCSS/DaisyUI, with diagrams rendered via React Flow.

## Current information architecture
- A left **"Explore" tree** is the primary navigation. Structure is 4 levels deep:
  **Namespace → Resource type → Item → (version via a Timeline scrubber)**.
- Resource types under every namespace: **Architectures, Patterns, Flows, Standards, ADRs,
  Interfaces**. A parallel top-level section lists **Control Domains → Controls**.
- Selecting an item opens a main panel with tabs: **Diagram**, **JSON**, **Deployments**.
  A node click opens a right-hand **detail drawer** (properties). A bottom **Timeline** bar
  navigates between versions of the item and drives both the Diagram and JSON views.
- There is a separate **Visualizer** route (drag-and-drop a CALM file) and an **Admin /
  Access Management** area.

## Problems identified so far (please address these, and find more)

### Navigation / information architecture (highest priority)
1. **The tree gets very long, very fast and is hard to read.** Expanding a single namespace's
   resource types already pushes the other ~10 namespaces below the fold; the 4-level nesting
   compounds it (see `issue-tree-long-and-empty`, `desktop-10`). Explore whether a **card-based
   browse** for collections (Architectures, Patterns, Controls, …) would work better than a deep
   tree — e.g. a namespace landing page with cards/tiles per item showing name, description,
   type, version count, and a thumbnail of the diagram.
2. **No indication of whether a branch has any items.** Clicking an empty resource type (e.g.
   ADRs) silently opens an empty container — no count, no "None yet" message, no loading→empty
   state. Users can't tell *empty* from *still loading* from *broken*. Add **item counts/badges**
   and proper **empty states**.
3. **Consider collapsing the per-namespace resource types into tabs.** Rather than nesting
   Architectures/Patterns/Flows/… in the tree, a **namespace detail page with a tab bar** (or
   segmented control) per resource type may be far more legible. Propose this as an option and
   weigh it against the card-browse idea.
4. Selecting tree nodes can leave the **main panel showing a stale, unrelated item** — the
   relationship between tree selection and main content needs to be obvious.

### Diagram & visual
5. **Desktop minimap** can render as an oversized solid-blue block that overflows its container
   when nodes are densely clustered (`desktop-02/03`); it renders fine when nodes are spread
   (`desktop-10`). Needs sizing/masking fixes or a toggle.
6. **Diagram node labels are very small** and hard to read at default zoom.
7. **Empty landing page** — no first-run guidance; ~75% of the screen is blank grey
   (`desktop-01`).
8. **Inconsistent active-state styling** — Admin uses a black pill on desktop but a blue
   underline on mobile; elsewhere selection is a blue accent. Needs one system.
9. **Search results don't disambiguate** identically-named items (no namespace/version shown)
   (`desktop-09`).

### Mobile
10. **The diagram does not fit-to-view on mobile** — it renders at desktop scale and overflows
    off-screen; the core feature is barely usable on a phone (`mobile-03/03b`). Needs `fitView`
    on load + visible zoom/fit controls.
11. Diagram controls (tabs, node search, timeline) are hidden behind an **unlabeled eye icon**
    ("View options", `mobile-04`) — low discoverability.
12. The mobile **drill-down nav** (`mobile-01/02`) and **node-detail full-screen takeover**
    (`mobile-07`) work well — keep these patterns; just note the takeover fully hides the
    diagram, losing context.

## What's already good (preserve the intent)
- Three-pane desktop model (tree | content | detail drawer).
- The **Timeline as a cross-view version navigator** — labeled, dated moments that re-render
  both Diagram and JSON (`verify-json-timeline-v1` → `v3`). Strong feature; just make its
  purpose more obvious.
- JSON view (line numbers, syntax highlighting, clickable `$schema`).
- Mobile JSON wrapping; mobile Admin reflow.

## Deliverables I want from you
1. A recommended **information architecture** for browsing namespaces and their artefacts —
   pick between (and justify) tree vs. card-browse vs. tabbed namespace detail, or a hybrid.
2. **Desktop layout concepts** for: the namespace/collection browse view, the item detail
   (Diagram/JSON/Deployments + Timeline + node drawer), and the empty/first-run state.
3. **Mobile layout concepts** for the same, prioritising a usable diagram (fit-to-view) and
   discoverable controls.
4. A small **component inventory** the redesign needs (cards, count badges, empty states,
   tab/segmented controls, the timeline/version navigator, the node drawer/bottom-sheet).
5. Call out anything in the current UI you'd **keep as-is**.

Keep it consistent with a Tailwind/DaisyUI build and the existing CALM blue brand accent.
Produce visual mockups, not just prose.
