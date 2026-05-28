import '@finos/calm-design-tokens/tokens.css'
import 'reactflow/dist/style.css'
import '@finos/calm-ui-react/diff/Diff.css'

import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CalmArchitectureSchema, CalmNodeSchema, CalmRelationshipSchema } from '@finos/calm-models/types'
import { CalmPreviewProvider } from '@finos/calm-ui-react/adapters'
import { ReactFlowVisualizer } from '@finos/calm-ui-react/visualizer/reactflow'
import { Sidebar } from '@finos/calm-ui-react/details'
import { VsCodeDataSource, VsCodeNavigator, type VsCodeWebviewApi } from './adapters/vscode-data-source.js'

declare global {
    interface Window {
        acquireVsCodeApi?: () => VsCodeWebviewApi
    }
}

const api: VsCodeWebviewApi =
    typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function'
        ? window.acquireVsCodeApi()
        : { postMessage: () => undefined }

const dataSource = new VsCodeDataSource(api)
const navigator = new VsCodeNavigator(api)

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

interface PreviewState {
    docRef: { kind: 'local'; uri: string } | { kind: 'hub'; namespace: string; calmType: 'Architectures' | 'Patterns'; id: string; version: string } | null
    selectedId: string | null
    architecture: CalmArchitectureSchema | null
}

function App() {
    const [state, setState] = useState<PreviewState>({ docRef: null, selectedId: null, architecture: null })

    // The host pushes `architectureData { docRef, architecture }` when the active
    // editor changes or the file is saved; we hold the current docRef + schema
    // in component state and re-render on every push.
    useEffect(() => {
        const unsubscribeArch = dataSource.onPush('architectureData', (payload) => {
            const p = payload as { docRef: PreviewState['docRef']; architecture: CalmArchitectureSchema }
            setState({ docRef: p.docRef, selectedId: null, architecture: p.architecture })
        })
        const unsubscribeSelect = dataSource.onPush('select', (payload) => {
            const p = payload as { id: string | null }
            setState((prev) => ({ ...prev, selectedId: p?.id ?? null }))
        })
        // Signal readiness so the host knows it can push the initial state.
        api.postMessage({ type: 'ready' })
        return () => {
            unsubscribeArch()
            unsubscribeSelect()
        }
    }, [])

    const onNodeClick = useCallback((node: CalmNodeSchema) => {
        const id = node['unique-id']
        if (!id) return
        setState((prev) => ({ ...prev, selectedId: id }))
        api.postMessage({ type: 'requestReveal', payload: { id } })
    }, [])

    const onEdgeClick = useCallback((edge: CalmRelationshipSchema) => {
        const id = edge['unique-id']
        if (!id) return
        setState((prev) => ({ ...prev, selectedId: id }))
        api.postMessage({ type: 'requestReveal', payload: { id } })
    }, [])

    const onBackgroundClick = useCallback(() => {
        setState((prev) => ({ ...prev, selectedId: null }))
    }, [])

    const selected = useMemo<CalmNodeSchema | CalmRelationshipSchema | null>(() => {
        if (!state.architecture || !state.selectedId) return null
        const node = state.architecture.nodes?.find((n) => n['unique-id'] === state.selectedId)
        if (node) return node as CalmNodeSchema
        const rel = state.architecture.relationships?.find((r) => r['unique-id'] === state.selectedId)
        return rel ? (rel as CalmRelationshipSchema) : null
    }, [state.architecture, state.selectedId])

    const closeSidebar = useCallback(() => {
        setState((prev) => ({ ...prev, selectedId: null }))
    }, [])

    if (!state.architecture) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--calm-text-secondary)' }}>
                Loading architecture…
            </div>
        )
    }

    return (
        <CalmPreviewProvider dataSource={dataSource} navigator={navigator}>
            <div style={{ height: '100%', display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    <ReactFlowVisualizer
                        calmData={state.architecture}
                        onNodeClick={onNodeClick}
                        onEdgeClick={onEdgeClick}
                        onBackgroundClick={onBackgroundClick}
                        viewportKey={state.docRef && state.docRef.kind === 'local' ? state.docRef.uri : undefined}
                    />
                </div>
                {selected && (
                    <Sidebar selectedData={selected} closeSidebar={closeSidebar} />
                )}
            </div>
        </CalmPreviewProvider>
    )
}

const rootEl = document.getElementById('root')
if (rootEl) {
    try {
        createRoot(rootEl).render(<App />)
        postLog('React preview mounted')
    } catch (e) {
        postError('Mount failed', e)
    }
}
