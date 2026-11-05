import { useEffect, useState } from 'react';
import { extensionService } from '../../service/extension-service.js';
import type { DecoratorView } from '../contracts/contracts.js';

export function useDecoratorViews(): readonly DecoratorView[] {
    const [views, setViews] = useState<readonly DecoratorView[]>([]);
    useEffect(() => {
        let cancelled = false;
        extensionService.fetchDecoratorViews().then((values) => {
            if (!cancelled) setViews(values);
        }).catch(() => {
            if (!cancelled) setViews([]);
        });
        return () => { cancelled = true; };
    }, []);
    return views;
}
