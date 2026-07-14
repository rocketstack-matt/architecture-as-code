import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RenderView } from './RenderView.js';
import type { CalmRenderData } from './RenderView.js';

// The graphs themselves are heavy ReactFlow components that don't lay out in
// jsdom; RenderView's job is choosing the right one, passing chromeless, and
// carrying data-render-container — which is what these stubs let us assert.
vi.mock('../visualizer/components/reactflow/ArchitectureGraph.js', () => ({
    ArchitectureGraph: (props: Record<string, unknown>) => (
        <div data-testid="architecture-graph" data-chromeless={String(props.chromeless)} />
    ),
}));

vi.mock('../visualizer/components/reactflow/PatternGraph.js', () => ({
    PatternGraph: (props: Record<string, unknown>) => (
        <div data-testid="pattern-graph" data-chromeless={String(props.chromeless)} />
    ),
}));

describe('RenderView', () => {
    beforeEach(() => {
        delete window.__CALM_RENDER_DATA;
    });

    afterEach(() => {
        delete window.__CALM_RENDER_DATA;
    });

    it('shows an error state when no render data has been injected', () => {
        render(<RenderView />);
        expect(screen.getByTestId('render-view-error')).toBeInTheDocument();
        expect(screen.queryByTestId('render-view-container')).not.toBeInTheDocument();
    });

    it('shows an error state when the injected documentType is not supported', () => {
        window.__CALM_RENDER_DATA = {
            documentType: 'flow',
            document: {},
        } as unknown as CalmRenderData;
        render(<RenderView />);
        expect(screen.getByTestId('render-view-error')).toBeInTheDocument();
    });

    it('shows an error state when the injected document is missing', () => {
        window.__CALM_RENDER_DATA = { documentType: 'architecture' } as unknown as CalmRenderData;
        render(<RenderView />);
        expect(screen.getByTestId('render-view-error')).toBeInTheDocument();
    });

    it('renders an architecture document in the chromeless architecture graph', () => {
        window.__CALM_RENDER_DATA = {
            documentType: 'architecture',
            document: { nodes: [], relationships: [] },
        };
        render(<RenderView />);
        expect(screen.getByTestId('architecture-graph')).toHaveAttribute('data-chromeless', 'true');
        expect(screen.queryByTestId('pattern-graph')).not.toBeInTheDocument();
    });

    it('renders a pattern document in the chromeless pattern graph', () => {
        window.__CALM_RENDER_DATA = {
            documentType: 'pattern',
            document: { properties: {} },
        };
        render(<RenderView />);
        expect(screen.getByTestId('pattern-graph')).toHaveAttribute('data-chromeless', 'true');
        expect(screen.queryByTestId('architecture-graph')).not.toBeInTheDocument();
    });

    it('wraps the graph in a full-viewport data-render-container element', () => {
        window.__CALM_RENDER_DATA = {
            documentType: 'architecture',
            document: { nodes: [] },
        };
        render(<RenderView />);
        const container = screen.getByTestId('render-view-container');
        expect(container).toHaveAttribute('data-render-container');
        expect(container).toHaveStyle({ width: '100vw', height: '100vh' });
    });
});
