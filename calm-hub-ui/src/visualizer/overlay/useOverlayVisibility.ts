import { useCallback, useMemo, useState } from 'react';
import type { ViewOverlay } from '../contracts/contracts.js';
import { viewKey } from './overlayEngine.js';

export const OVERLAY_VISIBILITY_KEY = 'calm-hub-overlay-views';
/** Without a stored choice, only this many views start switched on, so many extensions do not crowd each node. */
export const OVERLAYS_ON_BY_DEFAULT = 3;

type Choices = Record<string, boolean>;

function readChoices(storage: Storage | undefined): Choices {
    try {
        const parsed: unknown = JSON.parse(storage?.getItem(OVERLAY_VISIBILITY_KEY) ?? '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'boolean'));
    } catch {
        return {};
    }
}

function defaultStorage(): Storage | undefined {
    try {
        return localStorage;
    } catch {
        return undefined;
    }
}

/** Which overlay views the legend shows. A choice is kept in storage, for every diagram, by view key. */
export function useOverlayVisibility(overlays: readonly ViewOverlay[], storage: Storage | undefined = defaultStorage()) {
    const [choices, setChoices] = useState<Choices>(() => readChoices(storage));

    const hiddenViews = useMemo(() => {
        const hidden = new Set<string>();
        overlays.forEach(({ view }, index) => {
            const key = viewKey(view);
            if (!(choices[key] ?? index < OVERLAYS_ON_BY_DEFAULT)) hidden.add(key);
        });
        return hidden as ReadonlySet<string>;
    }, [overlays, choices]);

    const setViewsShown = useCallback(
        (keys: readonly string[], shown: boolean) => {
            setChoices((prev) => {
                const next = { ...prev };
                for (const key of keys) next[key] = shown;
                try {
                    storage?.setItem(OVERLAY_VISIBILITY_KEY, JSON.stringify(next));
                } catch {
                    // A full or blocked storage only loses the choice for the next visit.
                }
                return next;
            });
        },
        [storage],
    );

    const toggleView = useCallback(
        (key: string) => setViewsShown([key], hiddenViews.has(key)),
        [hiddenViews, setViewsShown],
    );

    return { hiddenViews, toggleView, setViewsShown };
}
