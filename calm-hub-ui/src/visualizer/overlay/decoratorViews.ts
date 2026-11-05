import { useEffect, useMemo, useState } from 'react';
import { ExtensionService } from '../../service/extension-service.js';
import type { DecoratorView } from '../contracts/contracts.js';

export function useDecoratorViews(): readonly DecoratorView[] {
    const service = useMemo(() => new ExtensionService(), []);
    const [views, setViews] = useState<readonly DecoratorView[]>([]);
    useEffect(() => {
        let cancelled = false;
        service.fetchDecoratorViews().then((values) => {
            if (!cancelled) setViews(values);
        }).catch(() => {
            if (!cancelled) setViews([]);
        });
        return () => { cancelled = true; };
    }, [service]);
    return views;
}
