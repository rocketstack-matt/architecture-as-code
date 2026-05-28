import '@finos/calm-design-tokens/tokens.css'
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { AdrView, type AdrDocument } from '@finos/calm-ui-react/views/AdrView'

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

interface AdrPush {
    type: 'push'
    name: 'adrData'
    payload: { adr: AdrDocument; sourceRef?: string } | null
}

function App() {
    const [adr, setAdr] = useState<AdrDocument | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sourceRef, setSourceRef] = useState<string | null>(null)

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            const data = event.data as { type?: string; name?: string; payload?: unknown } | undefined
            if (data?.type === 'push' && data.name === 'adrData') {
                const p = (data as AdrPush).payload
                if (p) {
                    setAdr(p.adr ?? null)
                    setSourceRef(p.sourceRef ?? null)
                    setError(null)
                } else {
                    setAdr(null)
                }
            }
            if (data?.type === 'push' && data.name === 'adrError') {
                const p = data.payload as { message?: string } | undefined
                setError(p?.message ?? 'Failed to load ADR')
            }
        }
        window.addEventListener('message', listener)
        api.postMessage({ type: 'ready' })
        return () => window.removeEventListener('message', listener)
    }, [])

    if (error) {
        return (
            <div style={{ padding: 24, color: 'var(--calm-status-error, #dc2626)' }}>
                <strong>Failed to load ADR</strong>
                <p style={{ marginTop: 8 }}>{error}</p>
                {sourceRef && <p style={{ marginTop: 8, fontFamily: 'var(--calm-font-mono-jb, monospace)' }}>{sourceRef}</p>}
            </div>
        )
    }

    if (!adr) {
        return (
            <div style={{ padding: 24, color: 'var(--calm-text-secondary, #64748b)' }}>
                Loading ADR…
            </div>
        )
    }

    return <AdrView adr={adr} />
}

const root = document.getElementById('root')
if (root) {
    try {
        createRoot(root).render(<App />)
        postLog('ADR webview mounted')
    } catch (e) {
        postError('Mount failed', e)
    }
}
