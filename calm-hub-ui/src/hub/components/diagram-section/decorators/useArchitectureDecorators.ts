import { useEffect, useState } from 'react';
import type { Data } from '../../../../model/calm.js';
import type { CalmService } from '../../../../service/calm-service.js';
import type { Decorator } from '../../../../visualizer/contracts/contracts.js';

export type ArchitectureDecoratorsState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'loaded'; decorators: Decorator[] };

const LOADING: ArchitectureDecoratorsState = { status: 'loading' };
const NONE: ArchitectureDecoratorsState = { status: 'loaded', decorators: [] };

/**
 * All decorators of one architecture version, of every type. A pattern has none.
 * The result is kept with the `data` it was fetched for, so another resource or version never shows it.
 */
export function useArchitectureDecorators(service: CalmService, data: Data, isArchitecture: boolean): ArchitectureDecoratorsState {
    const [loaded, setLoaded] = useState<{ source: Data; state: ArchitectureDecoratorsState } | null>(null);

    useEffect(() => {
        if (!isArchitecture) return;
        let cancelled = false;
        service
            .fetchArchitectureDecorators(data.name, data.id, data.version)
            .then(
                (decorators): ArchitectureDecoratorsState => ({ status: 'loaded', decorators }),
                (): ArchitectureDecoratorsState => ({ status: 'error' })
            )
            .then((state) => {
                if (!cancelled) setLoaded({ source: data, state });
            });
        return () => {
            cancelled = true;
        };
    }, [service, data, isArchitecture]);

    if (!isArchitecture) return NONE;
    return loaded?.source === data ? loaded.state : LOADING;
}
