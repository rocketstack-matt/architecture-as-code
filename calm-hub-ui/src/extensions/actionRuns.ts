import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

/**
 * The actions with a call in flight, by extension and contribution. It is kept outside the button, so a remount
 * (a collapsed section, a filter, a tab change) cannot enable a write that is still running.
 */
export class ActionRuns {
    private readonly running = new Set<string>();
    private readonly listeners = new Set<() => void>();

    isRunning(key: string): boolean {
        return this.running.has(key);
    }

    start(key: string): void {
        this.running.add(key);
        this.notify();
    }

    finish(key: string): void {
        if (this.running.delete(key)) this.notify();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify() {
        this.listeners.forEach((listener) => listener());
    }
}

export const ActionRunsContext = createContext<ActionRuns | null>(null);

export const actionRunKey = (extensionId: string, contributionId: string) => JSON.stringify([extensionId, contributionId]);

/** The provider's runs. Outside a provider, such as in a test, each component gets its own. */
export function useActionRuns(): ActionRuns {
    const shared = useContext(ActionRunsContext);
    return useMemo(() => shared ?? new ActionRuns(), [shared]);
}

export function useActionRunning(runs: ActionRuns, key: string): boolean {
    return useSyncExternalStore(
        (listener) => runs.subscribe(listener),
        () => runs.isRunning(key),
    );
}
