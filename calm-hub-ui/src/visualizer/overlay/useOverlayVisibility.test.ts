import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../test-support/memory-storage.js';
import { fakeView, fakeViewOverlays } from '../../test-support/fake-overlays.js';
import { OVERLAY_VISIBILITY_KEY, useOverlayVisibility } from './useOverlayVisibility.js';

describe('useOverlayVisibility', () => {
    it('switches on only the first three of ten views', () => {
        const views = fakeViewOverlays(10).map(({ view }) => view);
        const { result } = renderHook(() => useOverlayVisibility(views, createMemoryStorage()));
        expect([...result.current.hiddenViews]).toEqual(Array.from({ length: 7 }, (_, i) => `ext-${i + 4}/risk`));
    });

    it('remembers a choice for the next diagram', () => {
        const views = fakeViewOverlays(10).map(({ view }) => view);
        const storage = createMemoryStorage();
        const first = renderHook(() => useOverlayVisibility(views, storage));
        act(() => first.result.current.toggleView('ext-1/risk'));
        act(() => first.result.current.toggleView('ext-9/risk'));
        expect(first.result.current.hiddenViews.has('ext-1/risk')).toBe(true);
        expect(JSON.parse(storage.getItem(OVERLAY_VISIBILITY_KEY)!)).toEqual({ 'ext-1/risk': false, 'ext-9/risk': true });
        first.unmount();

        const second = renderHook(() => useOverlayVisibility(views, storage));
        expect(second.result.current.hiddenViews.has('ext-1/risk')).toBe(true);
        expect(second.result.current.hiddenViews.has('ext-9/risk')).toBe(false);
        expect(second.result.current.hiddenViews.has('ext-2/risk')).toBe(false);
    });

    it('switches several views at once', () => {
        const views = fakeViewOverlays(5).map(({ view }) => view);
        const { result } = renderHook(() => useOverlayVisibility(views, createMemoryStorage()));
        act(() => result.current.setViewsShown(['ext-4/risk', 'ext-5/risk'], true));
        expect(result.current.hiddenViews.size).toBe(0);
    });

    it('ignores a broken stored value', () => {
        const storage = createMemoryStorage();
        storage.setItem(OVERLAY_VISIBILITY_KEY, '[1]');
        const { result } = renderHook(() => useOverlayVisibility(fakeViewOverlays(2).map(({ view }) => view), storage));
        expect(result.current.hiddenViews.size).toBe(0);
    });
});

describe('useOverlayVisibility defaults', () => {
    it('keeps the built-in views on when three extension views sort before them', () => {
        const views = [
            fakeView('aaa'), fakeView('aab'), fakeView('aac'),
            fakeView('control-evaluation', 'control-evaluation'), fakeView('deployment', 'deployment'),
            fakeView('zzz'),
        ];
        const { result } = renderHook(() => useOverlayVisibility(views, createMemoryStorage()));
        expect([...result.current.hiddenViews]).toEqual(['zzz/risk']);
    });

    it('treats an operator view with a built-in id as an extension view', () => {
        const operator = { ...fakeView('ops', 'control-evaluation'), source: { id: 'ops', name: 'Ops', builtIn: false } };
        const views = [fakeView('aaa'), fakeView('aab'), fakeView('aac'), operator];
        const { result } = renderHook(() => useOverlayVisibility(views, createMemoryStorage()));
        expect([...result.current.hiddenViews]).toEqual(['ops/control-evaluation']);
    });

    it('hides a built-in view that the user turned off', () => {
        const storage = createMemoryStorage();
        storage.setItem(OVERLAY_VISIBILITY_KEY, JSON.stringify({ 'deployment/deployment': false }));
        const { result } = renderHook(() => useOverlayVisibility([fakeView('deployment', 'deployment')], storage));
        expect([...result.current.hiddenViews]).toEqual(['deployment/deployment']);
    });

    it('does not count a view without an overlay', () => {
        const views = [{ id: 'list', label: 'List', match: { type: 'list' }, source: { id: 'a', name: 'A', builtIn: false } },
            fakeView('b'), fakeView('c'), fakeView('d')];
        const { result } = renderHook(() => useOverlayVisibility(views, createMemoryStorage()));
        expect(result.current.hiddenViews.size).toBe(0);
    });
});
