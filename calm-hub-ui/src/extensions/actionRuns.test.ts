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

    it('keeps the last result until a new run starts or it is cleared', () => {
        const runs = new ActionRuns();
        const listener = vi.fn();
        runs.subscribe(listener);
        const key = actionRunKey('ext', 'scan');

        runs.start(key);
        runs.finish(key, { for: 'a', ok: true });
        expect(runs.outcome(key)).toEqual({ for: 'a', ok: true });
        runs.start(key);
        expect(runs.outcome(key)).toBeUndefined();
        runs.finish(key, { for: 'a', ok: false });
        runs.clearOutcome(key);
        expect(runs.outcome(key)).toBeUndefined();
        runs.clearOutcome(key);
        runs.finish(key, { for: 'b', ok: true });
        expect(listener).toHaveBeenCalledTimes(6);
    });

    it('keeps the keys of two extensions apart', () => {
        expect(actionRunKey('a/b', 'c')).not.toBe(actionRunKey('a', 'b/c'));
    });
});
