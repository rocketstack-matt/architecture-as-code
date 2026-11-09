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
 * Which collapsible sections are open, by section id. Without a stored choice only `defaultOpenId` is open: give the
 * first id of the full list, not of a filtered one, so a filter does not close a section.
 * A choice is kept in storage under `storageKey`.
 */
export function useOpenSections(storageKey: string, storage: Storage | undefined = defaultStorage()) {
    const [open, setOpen] = useState<OpenState>(() => read(storage, storageKey));

    const isOpen = useCallback((id: string, defaultOpenId: string | undefined) => open[id] ?? id === defaultOpenId, [open]);

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
