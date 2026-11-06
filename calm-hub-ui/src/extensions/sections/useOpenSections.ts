import { useCallback, useState } from 'react';

type OpenState = Record<string, boolean>;

function read(storage: Storage | undefined, key: string): OpenState {
    try {
        const parsed: unknown = JSON.parse(storage?.getItem(key) ?? '{}');
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

/**
 * Which collapsible sections are open, by section id. Without a stored choice only the first section is open.
 * A choice is kept in storage under `storageKey`.
 */
export function useOpenSections(storageKey: string, storage: Storage | undefined = defaultStorage()) {
    const [open, setOpen] = useState<OpenState>(() => read(storage, storageKey));

    const isOpen = useCallback((id: string, index: number) => open[id] ?? index === 0, [open]);

    const setSectionOpen = useCallback(
        (id: string, value: boolean) => {
            setOpen((prev) => {
                const next = { ...prev, [id]: value };
                try {
                    storage?.setItem(storageKey, JSON.stringify(next));
                } catch {
                    // A full or blocked storage only loses the choice for the next visit.
                }
                return next;
            });
        },
        [storage, storageKey],
    );

    return { isOpen, setSectionOpen };
}
