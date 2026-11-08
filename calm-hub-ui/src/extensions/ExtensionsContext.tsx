import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { ExtensionSummary } from '../model/extensions.js';
import { ExtensionService, extensionService } from '../service/extension-service.js';

export type ExtensionsStatus = 'loading' | 'loaded' | 'failed';

export const ExtensionsContext = createContext<ExtensionSummary[]>([]);
// 'loaded' outside a provider: a bare ExtensionsContext value is a settled registry.
export const ExtensionsStatusContext = createContext<ExtensionsStatus>('loaded');

export function ExtensionsProvider({ children, service }: { children: ReactNode; service?: ExtensionService }) {
    const [extensions, setExtensions] = useState<ExtensionSummary[]>([]);
    const [status, setStatus] = useState<ExtensionsStatus>('loading');
    const svc = service ?? extensionService;
    const request = useRef<{ service: ExtensionService; promise: Promise<ExtensionSummary[]> } | null>(null);
    useEffect(() => {
        let cancelled = false;
        if (request.current?.service !== svc) request.current = { service: svc, promise: svc.fetchExtensions() };
        request.current.promise
            .then((values) => {
                if (cancelled) return;
                setExtensions(values.filter((value) => value.hubApi === 0));
                setStatus('loaded');
            })
            .catch(() => {
                if (cancelled) return;
                setExtensions([]);
                setStatus('failed');
            });
        return () => {
            cancelled = true;
        };
    }, [svc]);
    return (
        <ExtensionsStatusContext.Provider value={status}>
            <ExtensionsContext.Provider value={extensions}>{children}</ExtensionsContext.Provider>
        </ExtensionsStatusContext.Provider>
    );
}

export function useExtensions() {
    return useContext(ExtensionsContext);
}

export function useExtensionsStatus() {
    return useContext(ExtensionsStatusContext);
}
