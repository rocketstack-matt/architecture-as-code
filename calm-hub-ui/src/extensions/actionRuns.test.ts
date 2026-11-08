import { describe, expect, it, vi } from 'vitest';
import { ActionRuns, actionRunKey } from './actionRuns.js';

describe('ActionRuns', () => {
    it('tells listeners when a run starts and finishes, and not after they unsubscribe', () => {
        const runs = new ActionRuns();
        const listener = vi.fn();
        const unsubscribe = runs.subscribe(listener);
        const key = actionRunKey('ext', 'scan');

        runs.start(key);
        expect(runs.isRunning(key)).toBe(true);
        runs.finish(key);
        expect(runs.isRunning(key)).toBe(false);
        runs.finish(key);
        expect(listener).toHaveBeenCalledTimes(2);

        unsubscribe();
        runs.start(key);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('keeps the keys of two extensions apart', () => {
        expect(actionRunKey('a/b', 'c')).not.toBe(actionRunKey('a', 'b/c'));
    });
});
