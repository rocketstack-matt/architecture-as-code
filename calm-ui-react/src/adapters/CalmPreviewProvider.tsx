import { createContext, useContext, type ReactNode } from 'react'
import type { CalmDataSource, CalmNavigator } from './data-source.js'

interface CalmPreviewContextValue {
    dataSource: CalmDataSource
    navigator: CalmNavigator
}

const CalmPreviewContext = createContext<CalmPreviewContextValue | null>(null)

export interface CalmPreviewProviderProps {
    dataSource: CalmDataSource
    navigator: CalmNavigator
    children: ReactNode
}

/**
 * Supplies a CalmDataSource and CalmNavigator to every component in the
 * shared React tree. Hub UI wraps its app with this once at startup; the
 * VSCode webview wraps its root mount with a postMessage-backed adapter.
 */
export function CalmPreviewProvider({
    dataSource,
    navigator,
    children,
}: CalmPreviewProviderProps) {
    return (
        <CalmPreviewContext.Provider value={{ dataSource, navigator }}>
            {children}
        </CalmPreviewContext.Provider>
    )
}

/**
 * Read the CalmDataSource provided by the nearest CalmPreviewProvider.
 * Throws when called outside a provider — preferred over silently returning
 * undefined since every consumer of this hook genuinely needs the data
 * source to function.
 */
export function useCalmDataSource(): CalmDataSource {
    const ctx = useContext(CalmPreviewContext)
    if (!ctx) {
        throw new Error(
            'useCalmDataSource() called outside <CalmPreviewProvider>. ' +
                'Wrap your app or component tree with the provider.'
        )
    }
    return ctx.dataSource
}

/** Counterpart to useCalmDataSource for the navigator surface. */
export function useCalmNavigator(): CalmNavigator {
    const ctx = useContext(CalmPreviewContext)
    if (!ctx) {
        throw new Error(
            'useCalmNavigator() called outside <CalmPreviewProvider>. ' +
                'Wrap your app or component tree with the provider.'
        )
    }
    return ctx.navigator
}
