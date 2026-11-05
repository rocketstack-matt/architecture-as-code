import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { ExtensionSummary } from '../../model/extensions.js';
import { ExtensionService, extensionService } from '../../service/extension-service.js';

export const ExtensionsContext = createContext<ExtensionSummary[]>([]);

export function ExtensionsProvider({ children, service }: { children: ReactNode; service?: ExtensionService }) {
    const [extensions, setExtensions] = useState<ExtensionSummary[]>([]);
    const svc = service ?? extensionService;
    const request = useRef<{ service: ExtensionService; promise: Promise<ExtensionSummary[]> } | null>(null);
    useEffect(() => {
        let cancelled = false;
        if (request.current?.service !== svc) request.current = { service: svc, promise: svc.fetchExtensions() };
        request.current.promise
            .then((values) => {
                if (!cancelled) setExtensions(values.filter((value) => value.hubApi === 0));
            })
            .catch(() => {
                if (!cancelled) setExtensions([]);
            });
        return () => {
            cancelled = true;
        };
    }, [svc]);
    return <ExtensionsContext.Provider value={extensions}>{children}</ExtensionsContext.Provider>;
}

export function useExtensions() {
    return useContext(ExtensionsContext);
}
