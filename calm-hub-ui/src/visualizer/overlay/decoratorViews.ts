import { useEffect, useState } from 'react';
import { extensionService } from '../../service/extension-service.js';
import type { DecoratorView } from '../contracts/contracts.js';
import { BUILTIN_DECORATOR_VIEWS } from './builtinDecoratorViews.js';

const NO_VIEWS: readonly DecoratorView[] = [];

/** The registered views. If the registry cannot be loaded, the built-in views, which do not need it. */
export function useDecoratorViews(): readonly DecoratorView[] {
    const [views, setViews] = useState<readonly DecoratorView[]>(NO_VIEWS);
    useEffect(() => {
        let cancelled = false;
        extensionService.fetchDecoratorViews().then((values) => {
            if (!cancelled) setViews(values);
        }).catch(() => {
            if (!cancelled) setViews(BUILTIN_DECORATOR_VIEWS);
        });
        return () => { cancelled = true; };
    }, []);
    return views;
}
