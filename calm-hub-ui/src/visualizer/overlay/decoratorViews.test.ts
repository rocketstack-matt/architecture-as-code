import { afterEach, beforeEach, it, expect, vi, type Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import manifest from '../../../../calm-hub/src/test/resources/extensions-test/operator/scanner/extension.json' with { type: 'json' };
import { overlayByElement } from './overlayEngine.js';
import type { OverlayDecoratorView } from '../contracts/contracts.js';
import { useDecoratorViews } from './decoratorViews.js';
import { BUILTIN_DECORATOR_VIEWS } from './builtinDecoratorViews.js';
import { ExtensionService } from '../../service/extension-service.js';

let fetchViews: Mock;
beforeEach(() => {
    fetchViews = vi.spyOn(ExtensionService.prototype, 'fetchDecoratorViews') as unknown as Mock;
});
afterEach(() => vi.restoreAllMocks());

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

it('falls back to the built-in views when the registry fails', async () => {
    fetchViews.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useDecoratorViews);
    await waitFor(() => expect(result.current).toBe(BUILTIN_DECORATOR_VIEWS));
});

it('shows only the registered views when the registry loads, even with no built-in views', async () => {
    fetchViews.mockResolvedValue([]);
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
