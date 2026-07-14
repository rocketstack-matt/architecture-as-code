import { CalmArchitectureSchema } from '@finos/calm-models/types';
import { ArchitectureGraph } from '../visualizer/components/reactflow/ArchitectureGraph.js';
import { PatternGraph } from '../visualizer/components/reactflow/PatternGraph.js';

/**
 * Render payload injected by calm-server (via Playwright `addInitScript`) before
 * any page script runs. The injected path is the only supported production path
 * for this route — there is deliberately no fetch-based fallback.
 */
export interface CalmRenderData {
    documentType: 'architecture' | 'pattern';
    document: Record<string, unknown>;
}

declare global {
    interface Window {
        __CALM_RENDER_DATA?: CalmRenderData;
    }
}

function readRenderData(): CalmRenderData | undefined {
    const data = window.__CALM_RENDER_DATA;
    if (
        !data ||
        (data.documentType !== 'architecture' && data.documentType !== 'pattern') ||
        !data.document ||
        typeof data.document !== 'object'
    ) {
        return undefined;
    }
    return data;
}

/**
 * Chrome-free diagram render page for the `/#/render` route. Driven by
 * calm-server's thumbnail endpoint: a headless browser injects
 * `window.__CALM_RENDER_DATA`, loads this route, waits for
 * `[data-render-ready="true"]` (set by the chromeless graph once layout has
 * settled) and screenshots the `[data-render-container]` element.
 */
export function RenderView() {
    const renderData = readRenderData();

    if (!renderData) {
        return (
            <div data-testid="render-view-error" style={{ padding: '16px', fontFamily: 'monospace' }}>
                No CALM render data available. This route is driven by calm-server, which injects
                window.__CALM_RENDER_DATA before the page loads.
            </div>
        );
    }

    return (
        <div
            data-render-container
            data-testid="render-view-container"
            style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, background: '#ffffff' }}
        >
            {renderData.documentType === 'pattern' ? (
                <PatternGraph patternData={renderData.document} chromeless />
            ) : (
                <ArchitectureGraph jsonData={renderData.document as CalmArchitectureSchema} chromeless />
            )}
        </div>
    );
}
