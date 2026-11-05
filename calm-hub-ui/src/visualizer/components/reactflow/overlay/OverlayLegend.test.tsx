import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverlayLegend } from './OverlayLegend.js';
import { DecoratorOverlayContext, type DecoratorOverlayState } from '../../../context/DecoratorOverlayContext.js';
import { BUILTIN_DECORATOR_VIEWS } from '../../../overlay/decoratorViews.js';
import type { ElementOverlay, OverlayDecoratorView, OverlayStatus } from '../../../contracts/contracts.js';

const [evaluationView, deploymentView] = BUILTIN_DECORATOR_VIEWS as OverlayDecoratorView[];
const element = (status: OverlayStatus): ElementOverlay => ({ status, value: status, entries: [] });

function renderLegend(state: Partial<DecoratorOverlayState>) {
    const value: DecoratorOverlayState = {
        overlays: [
            { view: evaluationView, elements: new Map([['a', element('error')], ['b', element('ok')], ['c', element('ok')]]) },
            { view: deploymentView, elements: new Map([['a', element('warn')]]) },
        ],
        hiddenViews: new Set(),
        toggleView: vi.fn(),
        ...state,
    };
    render(
        <DecoratorOverlayContext.Provider value={value}>
            <OverlayLegend />
        </DecoratorOverlayContext.Provider>
    );
    return value;
}

describe('OverlayLegend', () => {
    it('renders nothing when no view has an element on the diagram', () => {
        renderLegend({ overlays: [] });
        expect(screen.queryByTestId('overlay-legend')).not.toBeInTheDocument();
    });

    it('lists each view with how many elements show each status, worst first', () => {
        renderLegend({});
        const rows = screen.getAllByTestId('overlay-legend-row');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('Control evaluations1 Error2 OK');
        expect(rows[1]).toHaveTextContent('Deployments1 Warning');
    });

    it('toggles a view, and shows a hidden view unchecked', () => {
        const state = renderLegend({ hiddenViews: new Set(['deployment']) });
        expect(screen.getByRole('checkbox', { name: 'Control evaluations' })).toBeChecked();
        const deployments = screen.getByRole('checkbox', { name: 'Deployments' });
        expect(deployments).not.toBeChecked();

        fireEvent.click(deployments);
        expect(state.toggleView).toHaveBeenCalledWith('deployment');
    });

    it('offers View all only where the decorators can be listed', () => {
        const onOpenView = vi.fn();
        renderLegend({ onOpenView });
        fireEvent.click(screen.getAllByRole('button', { name: 'View all' })[1]);
        expect(onOpenView).toHaveBeenCalledWith(deploymentView);
    });

    it('has no View all without a list to open', () => {
        renderLegend({});
        expect(screen.queryByRole('button', { name: 'View all' })).not.toBeInTheDocument();
    });
});
