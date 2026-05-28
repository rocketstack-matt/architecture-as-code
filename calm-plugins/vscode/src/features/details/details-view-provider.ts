import * as vscode from 'vscode'
import * as fs from 'fs'
import type { Logger } from '../../core/ports/logger'
import type { ApplicationStoreApi } from '../../application-store'
import { detectFileType, FileType } from '../../models/file-types'

interface Incoming {
    type: string
    payload?: Record<string, unknown>
}

/**
 * `calmDetails` WebviewView — mounts the shared @finos/calm-ui-react Sidebar
 * inside a native VSCode sidebar view, so the diagram preview can fill the
 * full editor panel while the details still float beside the workbench.
 *
 * The provider holds no React state itself; it reacts to store changes by
 * pushing a `selectionData` envelope containing the raw CALM node or
 * relationship to the webview. The webview hands the payload to the
 * lifted Sidebar component which renders the same Details/JSON toggle the
 * Hub UI uses.
 */
export class CalmDetailsViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    public static readonly viewType = 'calmDetails'

    private view: vscode.WebviewView | undefined
    private webviewReady = false
    private disposables: vscode.Disposable[] = []
    private lastSelectionId: string | undefined
    private storeUnsubscribe: (() => void) | undefined

    constructor(
        private context: vscode.ExtensionContext,
        private store: ApplicationStoreApi,
        private log: Logger,
    ) {
        // React to store selection changes: pull the raw schema and push it.
        this.storeUnsubscribe = this.store.subscribe((state) => {
            if (state.selectedElementId === this.lastSelectionId) return
            this.lastSelectionId = state.selectedElementId
            void this.pushCurrentSelection()
        })
    }

    resolveWebviewView(view: vscode.WebviewView): void {
        this.view = view
        view.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
            ],
        }
        view.webview.html = this.buildHtml(view.webview)
        view.webview.onDidReceiveMessage(
            (raw: unknown) => this.handleIncoming(raw),
            undefined,
            this.disposables,
        )
        view.onDidDispose(() => {
            this.view = undefined
            this.webviewReady = false
        }, null, this.disposables)
    }

    dispose(): void {
        this.storeUnsubscribe?.()
        this.disposables.forEach((d) => { try { d.dispose() } catch { /* noop */ } })
    }

    private buildHtml(webview: vscode.Webview): string {
        const nonce = getNonce()
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'features', 'details', 'webview', 'main.global.js'),
        )
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'features', 'details', 'webview', 'main.css'),
        )
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'details.html').fsPath
        let html = fs.readFileSync(htmlPath, 'utf8')
        html = html
            .replace(/{{cspSource}}/g, webview.cspSource)
            .replace(/{{scriptUri}}/g, String(scriptUri))
            .replace(/{{styleUri}}/g, String(styleUri))
            .replace(/{{nonce}}/g, nonce)
        return html
    }

    private handleIncoming(raw: unknown): void {
        if (!raw || typeof raw !== 'object') return
        const msg = raw as Incoming
        switch (msg.type) {
        case 'ready':
            this.webviewReady = true
            void this.pushCurrentSelection()
            return
        case 'log':
            this.log.info?.(`[details][webview] ${String((msg.payload as { message?: string } | undefined)?.message ?? '')}`)
            return
        case 'error':
            this.log.error?.(`[details][webview] ${String((msg.payload as { message?: string } | undefined)?.message ?? '')}`)
            return
        case 'requestClearSelection':
            this.store.getState().clearSelection()
            return
        default:
            this.log.warn?.(`[details] Unknown message type: ${msg.type}`)
        }
    }

    private async pushCurrentSelection(): Promise<void> {
        if (!this.view || !this.webviewReady) return
        const state = this.store.getState()
        const selectedId = state.selectedElementId
        if (!selectedId) {
            this.push('selectionData', { data: null })
            return
        }
        const raw = await this.findRawForId(selectedId, state.currentDocumentUri)
        this.push('selectionData', { data: raw })
    }

    private async findRawForId(
        id: string,
        currentUri: vscode.Uri | undefined,
    ): Promise<unknown> {
        // 1. Check the ModelIndex's normalized nodes/relationships first —
        //    each carries its `raw` payload from the original JSON.
        const state = this.store.getState()
        const modelIndex = state.currentModelIndex
        if (modelIndex) {
            const nodeMatch = modelIndex.getNodes?.().find((n: { id: string }) => n.id === id) as
                { raw?: unknown } | undefined
            if (nodeMatch?.raw) return nodeMatch.raw
        }
        // 2. Fall back to re-reading the file so relationships (which
        //    ModelIndex doesn't expose with raw payloads) still resolve.
        if (currentUri) {
            try {
                const fileInfo = detectFileType(currentUri.fsPath)
                if (fileInfo.type === FileType.ArchitectureFile && fileInfo.isValid) {
                    const text = await fs.promises.readFile(currentUri.fsPath, 'utf8')
                    const json = currentUri.fsPath.endsWith('.json')
                        ? JSON.parse(text)
                        : (await import('yaml')).parse(text)
                    const node = (json?.nodes ?? []).find((n: { 'unique-id'?: string }) => n['unique-id'] === id)
                    if (node) return node
                    const rel = (json?.relationships ?? []).find((r: { 'unique-id'?: string }) => r['unique-id'] === id)
                    if (rel) return rel
                }
            } catch (e) {
                this.log.warn?.(`[details] Failed to resolve selection ${id}: ${String(e)}`)
            }
        }
        return null
    }

    private push(name: string, payload: unknown): void {
        try {
            this.view?.webview.postMessage({ type: 'push', name, payload })
        } catch { /* noop */ }
    }
}

function getNonce(): string {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}
