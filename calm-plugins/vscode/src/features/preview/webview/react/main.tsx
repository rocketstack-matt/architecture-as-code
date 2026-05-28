import '@finos/calm-design-tokens/tokens.css'
import 'reactflow/dist/style.css'
import '@finos/calm-ui-react/diff/Diff.css'

import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import type { CalmArchitectureSchema, CalmNodeSchema, CalmRelationshipSchema } from '@finos/calm-models/types'
import { CalmPreviewProvider } from '@finos/calm-ui-react/adapters'
import { ReactFlowVisualizer } from '@finos/calm-ui-react/visualizer/reactflow'
import { TimelineBar, TimelineDrawer, type TimelineMoment } from '@finos/calm-ui-react/shell'
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

type DocRef =
    | { kind: 'local'; uri: string }
    | { kind: 'hub'; namespace: string; calmType: 'Architectures' | 'Patterns'; id: string; version: string }

interface PreviewState {
    docRef: DocRef | null
    selectedId: string | null
    architecture: CalmArchitectureSchema | null
    /** Moments to render in the TimelineDrawer. Empty when the document
     *  carries no timeline metadata; the drawer hides in that case. */
    moments: TimelineMoment[]
    currentMomentKey: string | null
}

function App() {
    const [state, setState] = useState<PreviewState>({
        docRef: null,
        selectedId: null,
        architecture: null,
        moments: [],
        currentMomentKey: null,
    })

    // The host pushes `architectureData { docRef, architecture, moments?, currentMomentKey? }`
    // when the active editor changes or the file is saved.
    useEffect(() => {
        const unsubscribeArch = dataSource.onPush('architectureData', (payload) => {
            const p = payload as {
                docRef: DocRef
                architecture: CalmArchitectureSchema
                moments?: TimelineMoment[]
                currentMomentKey?: string | null
            }
            setState({
                docRef: p.docRef,
                selectedId: null,
                architecture: p.architecture,
                moments: p.moments ?? [],
                currentMomentKey: p.currentMomentKey ?? null,
            })
        })
        const unsubscribeSelect = dataSource.onPush('select', (payload) => {
            const p = payload as { id: string | null }
            setState((prev) => ({ ...prev, selectedId: p?.id ?? null }))
        })
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

    const onMomentNavigate = useCallback((version: string) => {
        // Forwarded to the host so it can resolve the moment's docRef and push
        // a fresh `architectureData` payload back. Diff overlay scheduling lives
        // on the host side too (it needs the previous moment's architecture to
        // compute the DiffResult).
        api.postMessage({ type: 'requestNavigateMoment', payload: { version } })
    }, [])

    if (!state.architecture) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--calm-text-secondary)' }}>
                Loading architecture…
            </div>
        )
    }

    const hasTimeline = state.moments.length > 0
    const currentVersion = state.currentMomentKey ?? state.moments[state.moments.length - 1]?.version ?? ''

    return (
        <CalmPreviewProvider dataSource={dataSource} navigator={navigator}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                    {/* The Sidebar that used to live here now renders inside the
                     *  native calmDetails sidebar view — the host pushes the
                     *  selected node/relationship to that webview whenever the
                     *  store's selection changes. Keeping the click handlers
                     *  here so the diagram still drives selection through the
                     *  host's requestReveal channel. */}
                    <ReactFlowVisualizer
                        calmData={state.architecture}
                        onNodeClick={onNodeClick}
                        onEdgeClick={onEdgeClick}
                        onBackgroundClick={onBackgroundClick}
                        viewportKey={state.docRef && state.docRef.kind === 'local' ? state.docRef.uri : undefined}
                    />
                </div>
                {hasTimeline && (
                    <TimelineDrawer label="Timeline">
                        <TimelineBar
                            moments={state.moments}
                            currentVersion={currentVersion}
                            timelineCurrentMomentId={state.currentMomentKey ?? undefined}
                            timelineIsExplicit={true}
                            onNavigate={onMomentNavigate}
                            /* Compare mode is not wired in the VSCode preview yet — the
                             * Hub-integration phase will supply DiffResult + per-version
                             * change loaders via the data source. Keeping the prop
                             * surface intact so the lifted TimelineBar renders. */
                            onCompare={() => undefined}
                        />
                    </TimelineDrawer>
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
