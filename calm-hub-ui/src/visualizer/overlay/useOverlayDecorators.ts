import { useEffect, useMemo, useState } from 'react';
import type { CalmService } from '../../service/calm-service.js';
import type { Data } from '../../model/calm.js';
import type { Decorator, DecoratorView } from '../contracts/contracts.js';
import { hasOverlay } from './overlayEngine.js';

export const OVERLAY_REFRESH_MS = 5000;
/** After this many failed refreshes in a row, refresh every OVERLAY_BACKOFF_MS until one succeeds. */
const OVERLAY_FAILURES_BEFORE_BACKOFF = 3;
const OVERLAY_BACKOFF_MS = 30000;
const NO_DECORATORS: Decorator[] = [];
/** One request with no type filter, for a view that matches on `$schema` only. */
const ALL_TYPES = '';

/** The decorator types to request for the overlay views: one request per type, or one for all types. */
export function overlayRequestTypes(views: readonly DecoratorView[]): string[] {
    const overlays = views.filter(hasOverlay);
    if (overlays.some((view) => !view.match.type)) return overlays.length ? [ALL_TYPES] : [];
    return [...new Set(overlays.map((view) => view.match.type!))].sort();
}

/**
 * The decorators that the overlay views draw on one architecture version, kept with the `data` they belong to.
 *
 * They change while the diagram is open (a merge gateway records each decision), so they are re-read every few
 * seconds. State changes only when the list does, so an unchanged refresh does not re-render the diagram. A refresh
 * fails as a whole if any request fails, and keeps what was last shown; a hidden tab is not polled.
 */
export function useOverlayDecorators(
    calmService: CalmService,
    architectureData: Data | undefined,
    views: readonly DecoratorView[],
): Decorator[] {
    const [loaded, setLoaded] = useState<{ source: Data; values: Decorator[] } | null>(null);
    // A key, not the array, so a new array with the same types does not restart the poll.
    const typesKey = useMemo(() => JSON.stringify(overlayRequestTypes(views)), [views]);

    useEffect(() => {
        const types = JSON.parse(typesKey) as string[];
        if (!architectureData || types.length === 0) return;
        const { name, id, version } = architectureData;
        let cancelled = false;
        // Polls can overlap on a slow network; a response older than one already applied is dropped.
        let requested = 0;
        let applied = 0;
        // A slug is resolved to the version's target once, not on every poll. An unresolved one is retried.
        let target: Promise<string | undefined> | undefined;
        let failures = 0;
        let ticksToSkip = 0;

        const update = (seq: number, next: Decorator[]) => {
            if (cancelled || seq < applied) return;
            applied = seq;
            failures = 0;
            ticksToSkip = 0;
            setLoaded((prev) =>
                prev?.source === architectureData && JSON.stringify(prev.values) === JSON.stringify(next)
                    ? prev
                    : { source: architectureData, values: next }
            );
        };
        const fail = (seq: number, error: unknown) => {
            if (cancelled || seq < applied) return;
            failures += 1;
            if (failures === 1) {
                console.error('%s', `Could not refresh decorators for ${name}/${id}/${version}:`, error);
            }
            if (failures >= OVERLAY_FAILURES_BEFORE_BACKOFF) {
                ticksToSkip = OVERLAY_BACKOFF_MS / OVERLAY_REFRESH_MS - 1;
            }
        };
        const resolveTarget = async () => {
            target ??= calmService.resolveArchitectureVersionTarget(name, id, version);
            const resolved = await target;
            if (!resolved) {
                target = undefined;
                throw new Error(`Could not resolve architecture ${id}`);
            }
            return resolved;
        };
        const load = () => {
            if (document.visibilityState === 'hidden') return;
            const seq = ++requested;
            resolveTarget()
                .then((resolved) => Promise.all(types.map((type) =>
                    calmService.fetchDecoratorsForTarget(name, resolved, type || undefined))))
                .then((lists) => update(seq, lists.flat()))
                .catch((error) => fail(seq, error));
        };
        const tick = () => {
            if (ticksToSkip > 0) {
                ticksToSkip -= 1;
                return;
            }
            load();
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') load();
        };

        load();
        const timer = setInterval(tick, OVERLAY_REFRESH_MS);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [architectureData, calmService, typesKey]);

    return architectureData && loaded?.source === architectureData ? loaded.values : NO_DECORATORS;
}
