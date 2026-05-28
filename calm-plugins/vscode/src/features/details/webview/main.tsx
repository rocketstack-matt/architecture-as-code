import '@finos/calm-design-tokens/tokens.css'
import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import type { CalmNodeSchema, CalmRelationshipSchema } from '@finos/calm-models/types'
import { Sidebar } from '@finos/calm-ui-react/details'

interface VsCodeWebviewApi {
    postMessage(message: unknown): void
}

declare global {
    interface Window {
        acquireVsCodeApi?: () => VsCodeWebviewApi
    }
}

const api: VsCodeWebviewApi =
    typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function'
        ? window.acquireVsCodeApi()
        : { postMessage: () => undefined }

function postLog(message: string) {
    api.postMessage({ type: 'log', payload: { message } })
}

function postError(context: string, error: unknown) {
    const e = error as { message?: string; stack?: string }
    api.postMessage({
        type: 'error',
        payload: { message: `${context}: ${e?.message ?? String(error)}`, stack: e?.stack },
    })
}

window.addEventListener('error', (ev) => postError('Window error', ev.error ?? ev.message))
window.addEventListener('unhandledrejection', (ev) => postError('Unhandled rejection', ev.reason))

interface DetailsPush {
    type: 'push'
    name: 'selectionData'
    payload: {
        data: CalmNodeSchema | CalmRelationshipSchema | null
    }
}

function App() {
    const [selected, setSelected] = useState<CalmNodeSchema | CalmRelationshipSchema | null>(null)

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            const data = event.data as { type?: string; name?: string; payload?: unknown } | undefined
            if (data?.type === 'push' && data.name === 'selectionData') {
                const p = (data as DetailsPush).payload
                setSelected(p?.data ?? null)
            }
        }
        window.addEventListener('message', listener)
        api.postMessage({ type: 'ready' })
        return () => window.removeEventListener('message', listener)
    }, [])

    const closeSidebar = useCallback(() => {
        // The native view doesn't close — clear the selection back to the host
        // so the preview / tree clear their highlights too.
        api.postMessage({ type: 'requestClearSelection' })
        setSelected(null)
    }, [])

    if (!selected) {
        return (
            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    textAlign: 'center',
                    color: 'var(--calm-text-secondary, #64748b)',
                    fontFamily: 'var(--calm-font-sans, system-ui, sans-serif)',
                    fontSize: 12,
                    lineHeight: 1.5,
                }}
            >
                Select a node or relationship in the preview to see its details here.
            </div>
        )
    }

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <Sidebar selectedData={selected} closeSidebar={closeSidebar} />
        </div>
    )
}

const root = document.getElementById('root')
if (root) {
    try {
        createRoot(root).render(<App />)
        postLog('Details webview mounted')
    } catch (e) {
        postError('Mount failed', e)
    }
}
