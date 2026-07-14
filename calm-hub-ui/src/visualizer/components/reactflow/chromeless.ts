import { useCallback, useState } from 'react';

/**
 * Shared plumbing for the graphs' chromeless (headless thumbnail render) mode —
 * see {@link ArchitectureGraph} / {@link PatternGraph} and RenderView. The
 * empty-state wrapper lives in {@link ChromelessEmptyState}.
 */

/**
 * Chromeless fit: the screenshot must show the whole graph in a fixed
 * card-shaped viewport, so the zoom floor drops well below the interactive
 * modes' legibility floors — a partially cropped thumbnail is worse than a
 * small one. maxZoom stays below the interactive cap so a tiny (one/two node)
 * graph doesn't render as a blown-up close-up in the thumbnail.
 */
export const CHROMELESS_FIT_VIEW_OPTIONS = { padding: 0.1, minZoom: 0.05, maxZoom: 0.8 } as const;

/**
 * Render-readiness state for chromeless mode: `renderReady` turns true when
 * {@link RenderReadySignal} fires (nodes measured + first paint settled) and is
 * surfaced as `data-render-ready` on the graph wrapper so calm-server's
 * headless browser knows the graph is safe to screenshot.
 */
export function useChromelessRender() {
    const [renderReady, setRenderReady] = useState(false);
    const markRenderReady = useCallback(() => setRenderReady(true), []);
    return { renderReady, markRenderReady };
}
