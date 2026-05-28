import * as vscode from 'vscode'
import { ModelService } from '../../core/services/model-service'
import { HtmlBuilder } from '../../cli/html-builder'
import type { Logger } from '../../core/ports/logger'

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
     * Externally-triggered selection (tree click, editor cursor move).
     * Pushed to the webview unsolicited.
     */
    postSelect(id: string | null) {
        this.push('select', { id })
    }

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
            this.push('architectureData', {
                docRef: { kind: 'local', uri: uri.fsPath },
                architecture: fullModelData,
            })
        } catch (err) {
            this.log.error?.(`[react-preview] Failed to read architecture: ${String(err)}`)
        }
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
}
