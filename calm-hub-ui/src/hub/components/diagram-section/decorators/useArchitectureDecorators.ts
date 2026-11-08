import { useEffect, useState } from 'react';
import type { Data } from '../../../../model/calm.js';
import type { CalmService } from '../../../../service/calm-service.js';
import type { Decorator } from '../../../../visualizer/contracts/contracts.js';

export type ArchitectureDecoratorsState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'loaded'; decorators: Decorator[] };

export const DECORATOR_REFRESH_MS = 5000;
/** After this many failed refreshes in a row, refresh every DECORATOR_BACKOFF_MS until one succeeds. */
const DECORATOR_FAILURES_BEFORE_BACKOFF = 3;
const DECORATOR_BACKOFF_MS = 30000;

const LOADING: ArchitectureDecoratorsState = { status: 'loading' };
const ERROR: ArchitectureDecoratorsState = { status: 'error' };
const NONE: ArchitectureDecoratorsState = { status: 'loaded', decorators: [] };

/**
 * All decorators of one architecture version, of every type. A pattern has none. This is the one source for the
 * diagram overlays, the Decorators tab and the details drawer, so they always show the same list.
 *
 * They change while the diagram is open (a merge gateway records each decision), so they are re-read every few
 * seconds. State changes only when the list does, so an unchanged refresh does not re-render the diagram. A failed
 * refresh keeps what was last shown; a hidden tab is not polled. The result is kept with the `data` it was fetched for,
 * so another resource or version never shows it.
 */
export function useArchitectureDecorators(service: CalmService, data: Data, isArchitecture: boolean): ArchitectureDecoratorsState {
    const [loaded, setLoaded] = useState<{ source: Data; state: ArchitectureDecoratorsState } | null>(null);

    useEffect(() => {
        if (!isArchitecture) return;
        const { name, id, version } = data;
        let cancelled = false;
        // Polls can overlap on a slow network; a response older than one already applied is dropped.
        let requested = 0;
        let applied = 0;
        // A slug is resolved to the version's target once, not on every poll. An unresolved one is retried.
        let target: Promise<string | undefined> | undefined;
        let failures = 0;
        let ticksToSkip = 0;

        const update = (seq: number, decorators: Decorator[]) => {
            if (cancelled || seq < applied) return;
            applied = seq;
            failures = 0;
            ticksToSkip = 0;
            setLoaded((prev) =>
                prev?.source === data && prev.state.status === 'loaded'
                    && JSON.stringify(prev.state.decorators) === JSON.stringify(decorators)
                    ? prev
                    : { source: data, state: { status: 'loaded', decorators } }
            );
        };
        const fail = (seq: number, error: unknown) => {
            if (cancelled || seq < applied) return;
            failures += 1;
            if (failures === 1) {
                console.error('%s', `Could not refresh decorators for ${name}/${id}/${version}:`, error);
            }
            if (failures >= DECORATOR_FAILURES_BEFORE_BACKOFF) {
                ticksToSkip = DECORATOR_BACKOFF_MS / DECORATOR_REFRESH_MS - 1;
            }
            setLoaded((prev) => (prev?.source === data && prev.state.status === 'loaded' ? prev : { source: data, state: ERROR }));
        };
        const resolveTarget = async () => {
            target ??= service.resolveArchitectureVersionTarget(name, id, version);
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
                .then((resolved) => service.fetchDecoratorsForTarget(name, resolved))
                .then((decorators) => update(seq, decorators))
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
        const timer = setInterval(tick, DECORATOR_REFRESH_MS);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [service, data, isArchitecture]);

    if (!isArchitecture) return NONE;
    return loaded?.source === data ? loaded.state : LOADING;
}
