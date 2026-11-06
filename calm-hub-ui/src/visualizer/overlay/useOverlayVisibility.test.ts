import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../test-support/memory-storage.js';
import { fakeViewOverlays } from '../../test-support/fake-overlays.js';
import { OVERLAY_VISIBILITY_KEY, useOverlayVisibility } from './useOverlayVisibility.js';

describe('useOverlayVisibility', () => {
    it('switches on only the first three of ten views', () => {
        const overlays = fakeViewOverlays(10);
        const { result } = renderHook(() => useOverlayVisibility(overlays, createMemoryStorage()));
        expect([...result.current.hiddenViews]).toEqual(Array.from({ length: 7 }, (_, i) => `ext-${i + 4}/risk`));
    });

    it('remembers a choice for the next diagram', () => {
        const overlays = fakeViewOverlays(10);
        const storage = createMemoryStorage();
        const first = renderHook(() => useOverlayVisibility(overlays, storage));
        act(() => first.result.current.toggleView('ext-1/risk'));
        act(() => first.result.current.toggleView('ext-9/risk'));
        expect(first.result.current.hiddenViews.has('ext-1/risk')).toBe(true);
        expect(JSON.parse(storage.getItem(OVERLAY_VISIBILITY_KEY)!)).toEqual({ 'ext-1/risk': false, 'ext-9/risk': true });
        first.unmount();

        const second = renderHook(() => useOverlayVisibility(overlays, storage));
        expect(second.result.current.hiddenViews.has('ext-1/risk')).toBe(true);
        expect(second.result.current.hiddenViews.has('ext-9/risk')).toBe(false);
        expect(second.result.current.hiddenViews.has('ext-2/risk')).toBe(false);
    });

    it('switches several views at once', () => {
        const overlays = fakeViewOverlays(5);
        const { result } = renderHook(() => useOverlayVisibility(overlays, createMemoryStorage()));
        act(() => result.current.setViewsShown(['ext-4/risk', 'ext-5/risk'], true));
        expect(result.current.hiddenViews.size).toBe(0);
    });

    it('ignores a broken stored value', () => {
        const storage = createMemoryStorage();
        storage.setItem(OVERLAY_VISIBILITY_KEY, '[1]');
        const { result } = renderHook(() => useOverlayVisibility(fakeViewOverlays(2), storage));
        expect(result.current.hiddenViews.size).toBe(0);
    });
});
