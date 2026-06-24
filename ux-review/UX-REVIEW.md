# CALM Hub UI — Layout & UX Review

**Environment:** calm-hub `quarkus:dev -Pstandalone` (NitriteDB), embedded UI build (23 Jun), seeded with 13 namespaces incl. TraderX, AI-governance controls, timeline-demo.
**Method:** Playwright drive-through at desktop (1440×900) and mobile (390×844). Screenshots in this folder.
**Scope reviewed:** Hub landing, tree navigation, architecture document (Diagram / JSON / Deployments tabs), node detail drawer, control-domain detail, standalone Visualizer upload, Admin/Access Management, global search. ADR / Flow / Standard / Interface renderers had no seed data and were not exercised live.

---

## Section 1 — Desktop rendering

### What works well
- **Three-pane model is coherent:** Explore tree | content | contextual detail drawer. The node drawer (service badge, description, typed PROPERTIES table, eye/JSON toggles) is a genuinely good pattern.
- **Diagram view is the strong centrepiece** — React Flow canvas with node-type search + "All types" filter, zoom/fit/lock controls, and a Timeline scrubber.
- **JSON tab** is well done: line numbers, syntax highlighting, clickable `$schema` link.
- **Empty states exist** where data is absent (Deployments → "No deployment history found", Admin → "No access grants").
- **The Timeline is a cross-view version navigator, not a diagram-only control.** On a multi-version architecture (timeline-demo "Trading Platform", versions 1.0.0→3.0.0) the labeled, dated moments ("Initial launch" → "Settlement go-live") drive the **JSON** view too: clicking a moment swaps the version (URL `…/6/1.0.0` → `…/6/3.0.0`) and the JSON re-renders with the version's nodes. A genuinely strong feature spanning Diagram and JSON. (verify-json-timeline-v1/v3)
- **Global search** is a fast typeahead grouped by type (ARCHITECTURES) with name + description.

### Issues & improvements (highest impact first)

1. **Minimap renders as an oversized solid-blue block that overflows its container.** On the diagram view the React Flow minimap fills as a near-solid blue rectangle and is clipped by the right edge of the canvas; with the node drawer open it collides with both the canvas and the Timeline bar. It reads as broken. *Fix: constrain minimap size, set a sensible `nodeColor`/mask opacity, and pad it clear of the Timeline bar — or make it toggleable.* (desktop-02, desktop-03)

2. **Empty landing canvas — no first-run guidance.** With nothing selected, ~75% of the screen is blank grey. *Fix: a welcome/empty state — "Select a namespace to explore," recent items, or counts of architectures/patterns/controls.* (desktop-01)

3. **Diagram node labels are very small.** Node titles are barely legible at default zoom on a dense graph. *Fix: larger min font, or scale label size with zoom; ensure labels stay readable when fit-to-view is applied.* (desktop-02)

4. **The Timeline's purpose isn't self-evident.** It works well as a version navigator (see above), but the slider + "NEW" badge don't communicate that clicking a moment changes the architecture *version* across Diagram/JSON. On single-version architectures it shows just one stop, which looks inert. *Fix: a short label/tooltip ("Browse versions") and a clearer empty/single-version treatment.* (desktop-04, verify-json-timeline-v1/v3)

5. **Admin: inconsistent section styling & wasted width.** "Global Admin Access" sits in a card while "Namespace Access" and "Domain Access" are bare dropdowns; controls are ~320px wide in a full-width column. *Fix: give all three sections the same card treatment and use the horizontal space (e.g. wider grant table).* (desktop-08)

6. **Active-state visual language is inconsistent.** The Admin sub-nav active item is a **black pill**, whereas selection elsewhere uses the **blue** brand accent. *Fix: standardise on the blue accent.* (desktop-08)

7. **Search results don't disambiguate duplicates.** Two identical "TraderX Architecture" rows with no namespace or version shown — impossible to tell apart. *Fix: show namespace + version (or id) on each result.* (desktop-09)

8. **Standalone Visualizer dropzone is too bare.** "Drag and drop your file here or Browse" floats in empty white with no drop boundary, icon, or accepted-file-type hint. *Fix: a bordered dropzone with an icon and "Accepts CALM JSON (architecture/pattern)" helper text; optionally a "try a sample" link.* (desktop-07)

9. **Duplicate data surfaced without grouping.** Every control in the ai-governance domain appears twice, and most architectures exist as two entries. Likely seed/version artefacts, but the UI presents them flat with no version/dedup affordance — same root cause as #7. (control list snapshot)

10. **Third-party "React Flow" attribution watermark** is visible on the canvas (bottom-left). Confirm licensing tier; if a Pro licence applies, hide it for a cleaner canvas. (desktop-02)

---

## Section 2 — Mobile rendering

**Expectation set:** this is a desktop-first architecture tool built around a graph canvas. Encouragingly, it has a **real responsive treatment** (not just a squeezed desktop) for navigation, JSON, admin, and detail panels. The graph canvas itself is the weak point.

### What works well
- **Navigation becomes a full-screen drill-down overlay** (column navigation): Namespaces/Control Domains → namespace → resource type → item, each with back + close and good ~48px touch targets. Search moves into the overlay full-width. (mobile-01, mobile-02)
- **"View options" sheet** neatly collapses the breadcrumb, Diagram/JSON/Deployments/Timeline tabs and node search into one panel — a thoughtful adaptation. (mobile-04)
- **JSON wraps instead of horizontal-scrolling** — readable, line numbers preserved, schema link wraps. (mobile-05)
- **Admin reflows cleanly** — left sub-nav becomes a top tab bar, forms/cards stack full-width. (mobile-06)
- **Node tap = full-screen detail takeover** (badge, description, properties) — a sound mobile pattern. (mobile-07)

### Issues & improvements (highest impact first)

1. **The diagram does not fit-to-view on mobile — the core feature is barely usable.** The canvas renders at desktop scale and overflows off the right edge; only "Web Client"/"Web GUI" are visible on load, with no obvious zoom/fit controls. *Fix: call React Flow `fitView` on mount and on viewport resize; expose zoom/fit controls in the mobile layout.* (mobile-03, mobile-03b) — **biggest mobile problem.**

2. **Diagram controls are hidden behind an unlabeled eye icon.** Tabs, node search and Timeline all live inside "View options," whose only affordance is an eye glyph that changes per active tab. Discoverability is low. *Fix: add a visible text label ("View") or a clearer control, and surface fit/zoom directly on the canvas.* (mobile-03 → mobile-04)

3. **Active-tab treatment differs from desktop.** Admin's active tab uses a blue underline on mobile but a black pill on desktop — same inconsistency as desktop #6, compounded across breakpoints. (mobile-06 vs desktop-08)

4. **Node detail fully hides the diagram, losing context.** The full-screen takeover is fine, but there's no peek of the graph and no swipe-between-nodes. *Fix: consider a bottom-sheet that leaves the selected node visible, or prev/next affordances.* (mobile-07)

5. **Property tables risk cramping.** The two-column key/value layout works for short values (Confidential, user) but longer values will wrap awkwardly at 390px. *Fix: stack label-above-value on narrow widths.* (mobile-07)

6. **Diagram page is fixed-height with no scroll fallback.** Because nothing scrolls and the canvas doesn't fit, off-screen nodes are only reachable by pan — undiscoverable without visible controls (ties to #1/#2). (mobile-03b)

---

## Priority shortlist
1. Mobile diagram `fitView` + visible zoom/fit controls (mobile #1/#2) — core feature currently broken on phones.
2. Fix the desktop minimap rendering/overflow (desktop #1) — reads as a bug.
3. Landing empty state + namespace/version disambiguation in tree & search (desktop #2/#7/#9).
4. Standardise active-state styling on the blue accent across breakpoints (desktop #6 / mobile #3).
5. Clarify the Timeline's "browse versions" purpose; flesh out the upload dropzone (desktop #4/#8).
