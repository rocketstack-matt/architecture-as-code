import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DecoratorOverlayContext } from '../../../context/DecoratorOverlayContext.js';
import { fakeDecorator, fakeView } from '../../../../test-support/fake-overlays.js';
import { extensionMarkerColour } from '../../../../extensions/extensionIdentity.js';
import { OverlayBadge, OverlayEdgeBadge } from './OverlayBadge.js';
import { detailsPosition } from './detailsPosition.js';
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

    it('returns focus to the badge on Escape and on the view link, but not on a press outside', () => {
        renderBadge();
        const badge = screen.getByTestId('overlay-badge');
        fireEvent.click(badge);
        expect(screen.getByRole('dialog')).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(badge).toHaveFocus();

        fireEvent.click(badge);
        fireEvent.click(screen.getByRole('button', { name: 'View all View release-risk' }));
        expect(badge).toHaveFocus();

        fireEvent.click(badge);
        fireEvent.pointerDown(document.body);
        expect(badge).not.toHaveFocus();
    });

    it('opens above a badge near the bottom of a phone screen, inside the viewport', () => {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
        renderBadge();
        const badge = screen.getByTestId('overlay-badge');
        vi.spyOn(badge, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 600, 60, 20));
        fireEvent.click(badge);
        const details = screen.getByRole('dialog');
        expect(details.style.top).toBe('');
        expect(details.style.bottom).toBe(`${667 - 600 + 6}px`);
        expect(details.style.maxHeight).toBe(`${600 - 6 - 8}px`);
        expect(details.style.left).toBe(`${375 - 288 - 8}px`);
    });

    it('marks a built-in view in the details', () => {
        const builtIn = { ...riskShown, view: fakeView('deployment', 'deployment', 'Deployments') };
        render(<OverlayBadge shown={builtIn} presenting={false} />);
        fireEvent.click(screen.getByTestId('overlay-badge'));
        expect(screen.getByRole('dialog')).toHaveTextContent('Built-in (Deployments)');
    });
});

describe('detailsPosition', () => {
    it('opens below the badge when there is room, and fits the rest of the screen', () => {
        expect(detailsPosition(new DOMRect(100, 100, 60, 20), 1024, 768)).toEqual({ left: 100, top: 126, maxHeight: 768 - 126 - 8 });
    });

    it('opens above when there is little room below and more above', () => {
        expect(detailsPosition(new DOMRect(100, 700, 60, 20), 1024, 768)).toEqual({ left: 100, bottom: 74, maxHeight: 686 });
    });

    it('stays below on a short screen when there is more room below than above', () => {
        expect(detailsPosition(new DOMRect(8, 20, 60, 20), 375, 300)).toEqual({ left: 8, top: 46, maxHeight: 246 });
    });
});
