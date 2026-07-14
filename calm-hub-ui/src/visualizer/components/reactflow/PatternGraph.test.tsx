import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PatternGraph } from './PatternGraph';

/**
 * Stub the heavy, DOM-measuring ReactFlow view components (as the
 * ArchitectureGraph tests do) but keep the real state hooks; capture the props
 * the chromeless assertions need.
 */
const reactFlowProps: { current: Record<string, unknown> | null } = { current: null };

vi.mock('reactflow', async () => {
    const actual = await vi.importActual<typeof import('reactflow')>('reactflow');
    return {
        ...actual,
        __esModule: true,
        // Nodes never measure in jsdom (and the stubbed ReactFlow provides no store
        // context), so report them initialized for the chromeless ready-signal tests.
        useNodesInitialized: () => true,
        default: (props: Record<string, unknown>) => {
            reactFlowProps.current = props;
            return <div data-testid="react-flow">{props.children as ReactNode}</div>;
        },
        Background: () => <div data-testid="rf-background" />,
        Controls: ({ children }: { children?: ReactNode }) => (
            <div data-testid="rf-controls">{children}</div>
        ),
        MiniMap: () => <div data-testid="diagram-minimap" />,
        Panel: ({ children }: { children?: ReactNode }) => (
            <div data-testid="rf-panel">{children}</div>
        ),
    };
});

// A minimal CALM pattern: properties.nodes.prefixItems drives the parsed nodes.
const mockPatternData: Record<string, unknown> = {
    properties: {
        nodes: {
            prefixItems: [
                {
                    properties: {
                        'unique-id': { const: 'node-1' },
                        name: { const: 'Service A' },
                        'node-type': { const: 'service' },
                    },
                },
                {
                    properties: {
                        'unique-id': { const: 'node-2' },
                        name: { const: 'Database B' },
                        'node-type': { const: 'database' },
                    },
                },
            ],
        },
        relationships: { prefixItems: [] },
    },
};

describe('PatternGraph', () => {
    beforeEach(() => {
        reactFlowProps.current = null;
        vi.clearAllMocks();
    });

    it('renders the chrome (controls, minimap, panels) in normal mode', () => {
        render(<PatternGraph patternData={mockPatternData} />);
        expect(screen.getByTestId('rf-controls')).toBeInTheDocument();
        expect(screen.getByTestId('diagram-minimap')).toBeInTheDocument();
        expect(screen.getAllByTestId('rf-panel').length).toBeGreaterThan(0);
    });

    describe('chromeless (thumbnail render mode)', () => {
        it('suppresses the Controls, MiniMap and panel chrome but keeps the Background', () => {
            render(<PatternGraph patternData={mockPatternData} chromeless />);
            expect(screen.queryByTestId('rf-controls')).not.toBeInTheDocument();
            expect(screen.queryByTestId('diagram-minimap')).not.toBeInTheDocument();
            expect(screen.queryByTestId('rf-panel')).not.toBeInTheDocument();
            expect(screen.getByTestId('rf-background')).toBeInTheDocument();
        });

        it('always fits the whole graph with a dropped zoom floor', () => {
            render(<PatternGraph patternData={mockPatternData} chromeless />);
            expect(reactFlowProps.current?.fitView).toBe(true);
            expect(reactFlowProps.current?.defaultViewport).toBeUndefined();
            expect(reactFlowProps.current?.fitViewOptions).toEqual({
                padding: 0.1,
                minZoom: 0.05,
                maxZoom: 0.8,
            });
        });

        it('sets data-render-ready on the wrapper once nodes initialize and paint settles', async () => {
            const { container } = render(<PatternGraph patternData={mockPatternData} chromeless />);
            await vi.waitFor(() => {
                expect(container.querySelector('[data-render-ready="true"]')).toBeInTheDocument();
            });
        });

        it('signals ready immediately for a genuinely empty document', () => {
            const { container } = render(<PatternGraph patternData={{}} chromeless />);
            expect(container.querySelector('[data-render-ready="true"]')).toBeInTheDocument();
        });

        it('never sets data-render-ready in normal interactive mode', () => {
            const { container } = render(<PatternGraph patternData={mockPatternData} />);
            expect(container.querySelector('[data-render-ready]')).not.toBeInTheDocument();
        });
    });
});
