import { type ReactNode } from 'react';

interface ChromelessEmptyStateProps {
    /** True when in chromeless mode AND the document parse has run. */
    signalReady: boolean;
    children: ReactNode;
}

/**
 * Wraps a graph's empty state so a chromeless render (see chromeless.ts) of a
 * genuinely empty document still signals ready — otherwise calm-server would
 * wait out its full render timeout for nothing. Outside chromeless mode the
 * children render unwrapped, exactly as before.
 */
export function ChromelessEmptyState({ signalReady, children }: ChromelessEmptyStateProps) {
    if (!signalReady) {
        return <>{children}</>;
    }
    return (
        <div style={{ height: '100%', width: '100%' }} data-render-ready="true">
            {children}
        </div>
    );
}
