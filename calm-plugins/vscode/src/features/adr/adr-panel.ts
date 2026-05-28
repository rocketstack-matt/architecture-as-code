import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { HtmlBuilder } from '../../cli/html-builder'
import type { Logger } from '../../core/ports/logger'

interface Incoming {
    type: string
    payload?: Record<string, unknown>
}

/**
 * Host-side webview panel that renders an ADR document via the shared
 * AdrView from @finos/calm-ui-react. The panel is opened from the
 * calmSidebar TreeView's ADR group via the `calm.openAdr` command.
 *
 * For Phase 8 ADR refs are resolved as filesystem paths only — either
 * absolute, or relative to the active editor document's workspace root.
 * The Hub-integration phase will extend resolution to handle Hub-hosted
 * ADR documents.
 */
export class AdrPanel {
    public static currentPanel: AdrPanel | undefined
    private readonly panel: vscode.WebviewPanel
    private disposables: vscode.Disposable[] = []
    private htmlBuilder: HtmlBuilder
    private webviewReady = false
    private pendingAdr: { adr: unknown; sourceRef: string } | undefined
    private pendingError: string | undefined

    static createOrShow(
        context: vscode.ExtensionContext,
        ref: string,
        log: Logger,
    ): AdrPanel {
        if (AdrPanel.currentPanel) {
            try {
                AdrPanel.currentPanel.reveal(ref)
                return AdrPanel.currentPanel
            } catch {
                log.info?.('[adr-panel] Existing panel invalid, recreating')
                AdrPanel.currentPanel = undefined
            }
        }
        const panel = vscode.window.createWebviewPanel(
            'calmAdr',
            'CALM ADR',
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
        AdrPanel.currentPanel = new AdrPanel(panel, context, log)
        AdrPanel.currentPanel.reveal(ref, { revealPanel: false })
        return AdrPanel.currentPanel
    }

    constructor(
        panel: vscode.WebviewPanel,
        private context: vscode.ExtensionContext,
        private log: Logger,
    ) {
        this.panel = panel
        this.htmlBuilder = new HtmlBuilder(context)

        this.panel.webview.html = this.htmlBuilder.getHtml(this.panel, {
            template: 'adr.html',
            scriptPath: ['dist', 'features', 'adr', 'webview', 'main.global.js'],
        })

        this.panel.webview.onDidReceiveMessage(
            (raw: unknown) => this.handleIncoming(raw),
            undefined,
            this.disposables,
        )
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
    }

    reveal(ref: string, options: { revealPanel?: boolean } = {}) {
        if (options.revealPanel !== false) {
            this.panel.reveal(vscode.ViewColumn.Beside)
        }
        this.panel.title = `CALM ADR — ${this.tailOfRef(ref)}`
        void this.loadAndPush(ref)
    }

    dispose() {
        AdrPanel.currentPanel = undefined
        while (this.disposables.length) {
            const d = this.disposables.pop()
            try { d?.dispose() } catch { /* noop */ }
        }
    }

    private handleIncoming(raw: unknown) {
        if (!raw || typeof raw !== 'object') return
        const msg = raw as Incoming
        switch (msg.type) {
        case 'ready':
            this.webviewReady = true
            if (this.pendingError) {
                this.push('adrError', { message: this.pendingError })
                this.pendingError = undefined
            } else if (this.pendingAdr) {
                this.push('adrData', this.pendingAdr)
                this.pendingAdr = undefined
            }
            return
        case 'log':
            this.log.info?.(`[adr-panel][webview] ${String((msg.payload as { message?: string } | undefined)?.message ?? '')}`)
            return
        case 'error':
            this.log.error?.(`[adr-panel][webview] ${String((msg.payload as { message?: string } | undefined)?.message ?? '')}`)
            return
        default:
            this.log.warn?.(`[adr-panel] Unknown message type: ${msg.type}`)
        }
    }

    private async loadAndPush(ref: string) {
        try {
            const adr = await this.resolve(ref)
            const payload = { adr, sourceRef: ref }
            if (this.webviewReady) this.push('adrData', payload)
            else this.pendingAdr = payload
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.log.error?.(`[adr-panel] Failed to load ADR ${ref}: ${message}`)
            if (this.webviewReady) this.push('adrError', { message })
            else this.pendingError = message
        }
    }

    private async resolve(ref: string): Promise<unknown> {
        // Absolute or workspace-relative file path. Hub-hosted refs land in
        // the upcoming Hub-integration phase.
        const candidates = this.candidatePaths(ref)
        for (const filePath of candidates) {
            try {
                const stat = await fs.promises.stat(filePath)
                if (!stat.isFile()) continue
                const content = await fs.promises.readFile(filePath, 'utf8')
                return JSON.parse(content)
            } catch {
                continue
            }
        }
        throw new Error(`Could not resolve ADR reference: ${ref}`)
    }

    private candidatePaths(ref: string): string[] {
        const candidates: string[] = []
        if (path.isAbsolute(ref)) {
            candidates.push(ref)
        }
        const folders = vscode.workspace.workspaceFolders ?? []
        for (const folder of folders) {
            candidates.push(path.join(folder.uri.fsPath, ref))
            candidates.push(path.join(folder.uri.fsPath, 'adrs', ref))
        }
        const activeUri = vscode.window.activeTextEditor?.document.uri
        if (activeUri) {
            candidates.push(path.join(path.dirname(activeUri.fsPath), ref))
        }
        return candidates
    }

    private push(name: string, payload: unknown) {
        try {
            this.panel.webview.postMessage({ type: 'push', name, payload })
        } catch { /* noop */ }
    }

    private tailOfRef(ref: string): string {
        const noQuery = ref.split('?')[0].split('#')[0]
        const idx = Math.max(noQuery.lastIndexOf('/'), noQuery.lastIndexOf('\\'))
        const tail = idx >= 0 ? noQuery.slice(idx + 1) : noQuery
        return tail || ref
    }
}
