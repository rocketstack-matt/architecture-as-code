import { it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import manifest from '../../../../calm-hub/src/test/resources/extensions-test/operator/scanner/extension.json' with { type: 'json' };
import { overlayByElement } from './overlayEngine.js';
import type { OverlayDecoratorView } from '../contracts/contracts.js';
import { useDecoratorViews } from './decoratorViews.js';

const fetchViews = vi.hoisted(() => vi.fn());
vi.mock('../../service/extension-service.js', () => ({
    extensionService: { fetchDecoratorViews: fetchViews },
}));

it('loads a new decorator type without a UI mapping', async () => {
    const views = manifest.contributes['decorator-views'] as OverlayDecoratorView[];
    fetchViews.mockResolvedValue(views);
    const { result } = renderHook(useDecoratorViews);
    await waitFor(() => expect(result.current).toEqual(views));
    const overlay = overlayByElement(result.current[0] as OverlayDecoratorView, [{
        uniqueId: 'scan-1', type: 'security-scan', target: ['architecture'],
        appliesTo: ['service'], data: { result: 'unsafe' },
    }]);
    expect(overlay.get('service')?.status).toBe('error');
});

it('leaves overlays off when the registry fails', async () => {
    fetchViews.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useDecoratorViews);
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toEqual([]);
});

it('ignores a registry response after unmount', async () => {
    let resolve!: (views: never[]) => void;
    fetchViews.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { unmount } = renderHook(useDecoratorViews);
    unmount();
    resolve([]);
});
