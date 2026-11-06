import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DecoratorOverlayContext } from '../../../context/DecoratorOverlayContext.js';
import { fakeDecorator, fakeView } from '../../../../test-support/fake-overlays.js';
import { extensionMarkerColour } from '../../../../extensions/extensionIdentity.js';
import { OverlayBadge, OverlayEdgeBadge } from './OverlayBadge.js';
import { OVERLAY_STYLES, overlayOutline } from './overlayStyle.js';
import { BUILTIN_DECORATOR_VIEWS } from '../../../../test-support/decorator-views.js';
import type { OverlayDecoratorView, OverlayStatus } from '../../../contracts/contracts.js';

const deploymentView = BUILTIN_DECORATOR_VIEWS.find((v) => v.id === 'deployment') as OverlayDecoratorView;
const shown = (status: OverlayStatus, value: string) => ({ view: deploymentView, overlay: { status, value, entries: [] } });

describe('OverlayBadge', () => {
    it.each([
        ['warn', 'rolled-back', 'Rolled back'],
        ['info', 'in-progress', 'In progress'],
        ['ok', 'completed', 'Completed'],
        ['error', 'failed', 'Failed'],
    ] as const)('draws a %s status in its text colour with the value as text', (status, value, text) => {
        render(<OverlayBadge shown={shown(status, value)} presenting={false} />);
        const badge = screen.getByTestId('overlay-badge');
        expect(badge).toHaveTextContent(text);
        expect(badge.getAttribute('aria-label')).toBe(`Deployments: ${text}`);
        expect(badge.dataset.view).toBe('deployment');
        expect(badge.dataset.status).toBe(status);
        expect(badge.style.color).toBe(OVERLAY_STYLES[status].text);
    });

    it('grows in presentation mode', () => {
        render(<OverlayBadge shown={shown('ok', 'completed')} presenting />);
        expect(screen.getByTestId('overlay-badge').style.fontSize).toBe('18px');
    });
});

describe('OverlayEdgeBadge', () => {
    it('shows the glyph and the value', () => {
        render(<OverlayEdgeBadge shown={shown('warn', 'rolled-back')} presenting={false} />);
        const badge = screen.getByTestId('edge-overlay-badge');
        expect(badge).toHaveTextContent('! Rolled back');
        expect(badge.style.color).toBe(OVERLAY_STYLES.warn.text);
    });
});

describe('overlayOutline', () => {
    it('outlines only error and warn', () => {
        expect(overlayOutline('error')).toBe(OVERLAY_STYLES.error.accent);
        expect(overlayOutline('warn')).toBe(OVERLAY_STYLES.warn.accent);
        expect(overlayOutline('ok')).toBeUndefined();
        expect(overlayOutline('info')).toBeUndefined();
        expect(overlayOutline(undefined)).toBeUndefined();
    });
});

describe('OverlayBadge details', () => {
    const view = fakeView('release-tracker', 'release-risk', 'Release tracker');
    const entry = (id: string, value: string, status: OverlayStatus) => ({
        decorator: fakeDecorator(id, {}),
        value,
        status,
        label: `Summary ${id}`,
        time: '2026-11-06T10:00:00Z',
    });
    const riskShown = { view, overlay: { status: 'error' as const, value: 'high', entries: [entry('d1', 'high', 'error'), entry('d2', 'low', 'ok')] } };

    function renderBadge(onOpenView = vi.fn(), onNodeClick = vi.fn()) {
        render(
            <DecoratorOverlayContext.Provider value={{ overlays: [], hiddenViews: new Set(), toggleView: vi.fn(), onOpenView }}>
                <div onClick={onNodeClick}>
                    <OverlayBadge shown={riskShown} presenting={false} />
                </div>
            </DecoratorOverlayContext.Provider>
        );
        return { onOpenView, onNodeClick };
    }

    it('names the view and extension, and shows the extension marker', () => {
        renderBadge();
        const badge = screen.getByTestId('overlay-badge');
        expect(badge).toHaveAccessibleName('View release-risk · Release tracker: High');
        expect(screen.getByTestId('overlay-marker').dataset.colour).toBe(extensionMarkerColour('release-tracker'));
    });

    it('shows the extension, view, status and tone, label and time on a click, without selecting the node', () => {
        const { onNodeClick } = renderBadge();
        fireEvent.click(screen.getByTestId('overlay-badge'));
        const details = screen.getByRole('dialog', { name: 'View release-risk · Release tracker' });
        expect(details).toHaveTextContent('ExtensionRelease tracker');
        expect(details).toHaveTextContent('ViewView release-risk');
        const entries = screen.getAllByTestId('overlay-badge-entry');
        expect(entries[0]).toHaveTextContent('High → Error');
        expect(entries[0]).toHaveTextContent('Summary d1');
        expect(entries[0]).toHaveTextContent(new Date('2026-11-06T10:00:00Z').toLocaleString());
        expect(entries[1]).toHaveTextContent('Low → OK');
        expect(onNodeClick).not.toHaveBeenCalled();
        expect(screen.getByTestId('overlay-badge')).toHaveAttribute('aria-expanded', 'true');
    });

    it('links to the view list', () => {
        const { onOpenView } = renderBadge();
        fireEvent.click(screen.getByTestId('overlay-badge'));
        fireEvent.click(screen.getByRole('button', { name: 'View all View release-risk' }));
        expect(onOpenView).toHaveBeenCalledWith(view);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on Escape, on a press outside, and on a second click', () => {
        renderBadge();
        const badge = screen.getByTestId('overlay-badge');
        fireEvent.click(badge);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(badge);
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(badge);
        fireEvent.pointerDown(badge);
        fireEvent.click(badge);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('marks a built-in view in the details', () => {
        const builtIn = { ...riskShown, view: fakeView('deployment', 'deployment', 'Deployments') };
        render(<OverlayBadge shown={builtIn} presenting={false} />);
        fireEvent.click(screen.getByTestId('overlay-badge'));
        expect(screen.getByRole('dialog')).toHaveTextContent('Built-in (Deployments)');
    });
});
