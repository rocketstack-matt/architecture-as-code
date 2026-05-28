import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { ModelService } from '../../core/services/model-service'
import { HtmlBuilder } from '../../cli/html-builder'
import { detectCalmTimeline } from '../../models/model'
import type { Logger } from '../../core/ports/logger'

interface TimelineMomentLite {
    key: string
    version: string
    label: string
    description?: string
    /** Optional ISO date — TimelineBar renders a date stamp when supplied. */
    date?: string
}

/**
 * Wire shape for the request/response message protocol used by the React
 * webview's vscode-data-source adapter. The webview is the requester; the
 * host echoes responses with the matching requestId.
 */
interface Incoming {
    type: string
    requestId?: string
    payload?: Record<string, unknown>
}

interface DocRef {
    kind: 'local' | 'hub'
    uri?: string
    namespace?: string
    calmType?: 'Architectures' | 'Patterns'
    id?: string
    version?: string
}

/**
 * Host-side companion to the React webview. Mirrors the existing
 * CalmPreviewPanel singleton pattern but speaks a slim data-request
 * protocol (no docify/template/markdown plumbing — that lives in the
 * legacy preview which is being phased out).
 *
 * For Phase 6 this panel handles only the local-file path. Hub document
 * loading (DocRef.kind === 'hub') is stubbed and will be wired up in the
 * Hub-integration phase.
 */
export class ReactPreviewPanel {
    public static currentPanel: ReactPreviewPanel | undefined

    private readonly panel: vscode.WebviewPanel
    private disposables: vscode.Disposable[] = []
    private readyHandlers: Array<(ready: boolean) => void> = []
    private modelService: ModelService
    private htmlBuilder: HtmlBuilder
    private currentUri: vscode.Uri | undefined
    private webviewReady = false

    static createOrShow(
        context: vscode.ExtensionContext,
        uri: vscode.Uri,
        log: Logger,
    ): ReactPreviewPanel {
        if (ReactPreviewPanel.currentPanel) {
            try {
                ReactPreviewPanel.currentPanel.reveal(uri)
                return ReactPreviewPanel.currentPanel
            } catch {
                log.info?.('[react-preview] Existing panel was invalid, creating a new one')
                ReactPreviewPanel.currentPanel = undefined
            }
        }
        const panel = vscode.window.createWebviewPanel(
            'calmReactPreview',
            'CALM Preview (React)',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'dist'),
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                ],
            },
        )
        ReactPreviewPanel.currentPanel = new ReactPreviewPanel(panel, context, log)
        ReactPreviewPanel.currentPanel.reveal(uri, { revealPanel: false })
        return ReactPreviewPanel.currentPanel
    }

    constructor(
        panel: vscode.WebviewPanel,
        private context: vscode.ExtensionContext,
        private log: Logger,
    ) {
        this.panel = panel
        this.modelService = new ModelService()
        this.htmlBuilder = new HtmlBuilder(context)

        this.panel.webview.html = this.htmlBuilder.getHtml(this.panel, {
            template: 'preview-react.html',
            scriptPath: ['dist', 'webview', 'react', 'main.global.js'],
        })

        this.panel.webview.onDidReceiveMessage(
            (raw: unknown) => this.handleIncoming(raw),
            undefined,
            this.disposables,
        )
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
    }

    reveal(uri: vscode.Uri, options: { revealPanel?: boolean } = {}) {
        this.currentUri = uri
        if (options.revealPanel !== false) {
            this.panel.reveal(vscode.ViewColumn.Beside)
        }
        if (this.webviewReady) {
            void this.pushArchitecture(uri)
        }
    }

    getCurrentUri(): vscode.Uri | undefined {
        return this.currentUri
    }

    /**
     * Framework-agnostic mirror of `getCurrentUri` for SelectionService.
     */
    getCurrentUriPath(): string | undefined {
        return this.currentUri?.fsPath
    }

    /**
     * Same as `reveal` but takes a string path. Used by SelectionService when
     * it only has a workspace document path on hand.
     */
    revealFile(filePath: string): void {
        this.reveal(vscode.Uri.file(filePath))
    }

    /**
     * Triggered by RefreshService after a successful file read. The legacy
     * preview took a pre-built GraphData; the React preview reads the raw
     * architecture from the current URI and pushes it itself, so this is a
     * thin "re-push from disk" call. Any selectedId in the legacy payload
     * is forwarded to the webview via postSelect.
     */
    setData(payload?: { selectedId?: string } | unknown): void {
        const selectedId = (payload as { selectedId?: string } | undefined)?.selectedId
        if (this.currentUri) void this.pushArchitecture(this.currentUri)
        if (selectedId) this.postSelect(selectedId)
    }

    /**
     * Externally-triggered selection (tree click, editor cursor move).
     * Pushed to the webview unsolicited.
     */
    postSelect(id: string | null) {
        this.push('select', { id })
    }

    /**
     * Subscribe to selection events posted from the webview (node / edge
     * clicks). Aliased here to the existing `onRevealInEditor` so callers
     * with the legacy `onDidSelect` contract still work.
     */
    onDidSelect(handler: (id: string) => void): void {
        this.onRevealInEditor(handler)
    }

    /**
     * Legacy hook — the docify path used this to read the current tree
     * selection during rendering. The React preview gets the selection from
     * the webview's own state, so this is a no-op.
     */
    setGetCurrentTreeSelection(_fn: () => string | undefined): void { /* noop */ }

    /**
     * Legacy hook — the docify path observed `calm.docify.theme` changes.
     * The React preview's design-tokens stylesheet is theme-agnostic at the
     * moment, so this is a no-op.
     */
    configurationChanged(): void { /* noop */ }

    dispose() {
        ReactPreviewPanel.currentPanel = undefined
        while (this.disposables.length) {
            const d = this.disposables.pop()
            try { d?.dispose() } catch { /* noop */ }
        }
    }

    private async handleIncoming(raw: unknown) {
        if (!raw || typeof raw !== 'object') return
        const msg = raw as Incoming
        try {
            switch (msg.type) {
            case 'ready':
                this.webviewReady = true
                this.readyHandlers.forEach(h => { try { h(true) } catch { /* noop */ } })
                if (this.currentUri) await this.pushArchitecture(this.currentUri)
                return
            case 'log':
                this.log.info?.(`[react-preview][webview] ${String((msg.payload as { message?: string } | undefined)?.message ?? '')}`)
                return
            case 'error':
                this.log.error?.(`[react-preview][webview] ${String((msg.payload as { message?: string } | undefined)?.message ?? '')}`)
                return
            case 'requestArchitecture': {
                const docRef = (msg.payload as { docRef?: DocRef } | undefined)?.docRef
                await this.respondWithArchitecture(msg.requestId, docRef)
                return
            }
            case 'requestReveal':
                // Hook target for the existing SelectionService.syncFromPreview wiring.
                // Bound by the panel factory when it constructs this panel.
                this.revealHandlers.forEach(h => h(String((msg.payload as { id?: string } | undefined)?.id ?? '')))
                return
            case 'requestNavigateMoment': {
                // Phase 9 places the navigator-only — diff-overlay between
                // moments lands once the data source can fetch moment-specific
                // architectures via Hub REST. For now the host logs the
                // intent so it shows up in the CALM output channel.
                const version = String((msg.payload as { version?: string } | undefined)?.version ?? '')
                this.log.info?.(`[react-preview] Timeline moment requested: ${version}`)
                return
            }
            default:
                this.log.warn?.(`[react-preview] Unknown message type: ${msg.type}`)
            }
        } catch (err) {
            this.log.error?.(`[react-preview] Error handling ${msg.type}: ${String(err)}`)
            if (msg.requestId) {
                this.respond(msg.requestId, false, undefined, err instanceof Error ? err.message : String(err))
            }
        }
    }

    private async pushArchitecture(uri: vscode.Uri) {
        try {
            const fullModelData = await this.modelService.readModelAsync(uri.fsPath)
            // If a sibling timeline document exists in the same directory, project
            // its moments onto the drawer. The architecture itself is shown as-is
            // (Phase 9 ships the navigator UI; diff-overlay across moments lands
            // in the follow-up Hub-integration phase along with the
            // diff transformer wiring on the webview side).
            const timeline = await this.findSiblingTimeline(uri)
            const { moments, currentMomentKey } = projectTimelineMoments(timeline)
            this.push('architectureData', {
                docRef: { kind: 'local', uri: uri.fsPath },
                architecture: fullModelData,
                moments,
                currentMomentKey,
            })
        } catch (err) {
            this.log.error?.(`[react-preview] Failed to read architecture: ${String(err)}`)
        }
    }

    private async findSiblingTimeline(uri: vscode.Uri): Promise<unknown | null> {
        try {
            const dir = path.dirname(uri.fsPath)
            const entries = await fs.promises.readdir(dir)
            for (const name of entries) {
                if (!/\.(json|ya?ml)$/i.test(name)) continue
                const full = path.join(dir, name)
                if (full === uri.fsPath) continue
                let content: string
                try {
                    content = await fs.promises.readFile(full, 'utf8')
                } catch { continue }
                if (detectCalmTimeline(content)) {
                    try {
                        return name.endsWith('.json')
                            ? JSON.parse(content)
                            : (await import('yaml')).parse(content)
                    } catch { /* fall through */ }
                }
            }
        } catch { /* directory unreadable — proceed without timeline */ }
        return null
    }

    private async respondWithArchitecture(requestId: string | undefined, docRef: DocRef | undefined) {
        if (!docRef) {
            return this.respond(requestId, false, undefined, 'docRef required')
        }
        if (docRef.kind === 'local') {
            if (!docRef.uri) return this.respond(requestId, false, undefined, 'docRef.uri required for local docs')
            const fullModelData = await this.modelService.readModelAsync(docRef.uri)
            return this.respond(requestId, true, fullModelData)
        }
        // Hub mode lands with the Hub REST integration phase.
        this.respond(requestId, false, undefined, 'Hub document loading is not yet wired in the React preview')
    }

    private respond(requestId: string | undefined, ok: boolean, data?: unknown, error?: string) {
        if (!requestId) return
        try {
            this.panel.webview.postMessage({ type: 'response', requestId, ok, data, error })
        } catch { /* noop */ }
    }

    private push(name: string, payload: unknown) {
        try {
            this.panel.webview.postMessage({ type: 'push', name, payload })
        } catch { /* noop */ }
    }

    private revealHandlers: Array<(id: string) => void> = []
    onRevealInEditor(handler: (id: string) => void) {
        this.revealHandlers.push(handler)
    }

    /** Tracks whether the webview has signalled `ready` (JS executed + listeners attached). */
    isReady(): boolean {
        return this.webviewReady
    }

    /**
     * Subscribe to webview readiness transitions. Handler fires immediately
     * with the current state. Returns an unsubscribe.
     */
    onReady(handler: (ready: boolean) => void): { dispose: () => void } {
        this.readyHandlers.push(handler)
        try { handler(this.webviewReady) } catch { /* noop */ }
        return {
            dispose: () => {
                const i = this.readyHandlers.indexOf(handler)
                if (i >= 0) this.readyHandlers.splice(i, 1)
            },
        }
    }

    onDidDispose(handler: () => void): void {
        this.panel.onDidDispose(handler, null, this.disposables)
    }
}

/**
 * Convert a parsed CALM timeline JSON into the shape TimelineBar expects.
 * Defensive: skips moments without a usable key/version and falls back to
 * sensible defaults when optional fields are missing.
 */
function projectTimelineMoments(timeline: unknown): {
    moments: TimelineMomentLite[]
    currentMomentKey: string | null
} {
    if (!timeline || typeof timeline !== 'object') {
        return { moments: [], currentMomentKey: null }
    }
    const tl = timeline as { moments?: unknown[]; 'current-moment'?: string }
    const raw = Array.isArray(tl.moments) ? tl.moments : []
    const moments: TimelineMomentLite[] = []
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue
        const m = entry as {
            'unique-id'?: string
            name?: string
            description?: string
            'valid-from'?: string
            details?: { 'detailed-architecture'?: { reference?: string; version?: string } }
        }
        const key = m['unique-id']
        if (!key) continue
        const version =
            m.details?.['detailed-architecture']?.version ??
            m.details?.['detailed-architecture']?.reference ??
            key
        moments.push({
            key,
            version: String(version),
            label: m.name ?? key,
            description: m.description,
            date: m['valid-from'],
        })
    }
    return { moments, currentMomentKey: tl['current-moment'] ?? null }
}
