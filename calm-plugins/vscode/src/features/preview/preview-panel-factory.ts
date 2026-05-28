import * as vscode from 'vscode'
import { ReactPreviewPanel } from './react-preview-panel'
import type { Logger } from '../../core/ports/logger'

/**
 * Minimal contract the rest of the orchestration (RefreshService,
 * SelectionService, StoreReactionMediator) cares about. The legacy
 * PreviewViewModelInterface plus PreviewLike are collapsed into this single
 * shape — there is now exactly one preview panel implementation, so the
 * ports/adapters split that hid the legacy CalmPreviewPanel is gone.
 */
export interface PreviewPanelPort {
    reveal(uri: vscode.Uri): void
    revealFile(filePath: string): void
    getCurrentUri(): vscode.Uri | undefined
    getCurrentUriPath(): string | undefined
    setData(payload?: unknown): void
    postSelect(id: string | null): void
    onRevealInEditor(handler: (id: string) => void): void
    onDidSelect(handler: (id: string) => void): void
    onDidDispose(handler: () => void): void
    setGetCurrentTreeSelection(fn: () => string | undefined): void
    configurationChanged(): void
    isReady(): boolean
    onReady(handler: (ready: boolean) => void): { dispose: () => void }
}

/**
 * Thin facade over the ReactPreviewPanel singleton — its only job is to
 * paper over the difference between "the panel hasn't been opened yet" and
 * "the panel is the currently-open singleton" for callers that don't want
 * to depend on ReactPreviewPanel directly.
 */
export class PreviewPanelFactory implements vscode.Disposable {
    private disposables: vscode.Disposable[] = []

    /** Returns the current panel or undefined if no preview is open. */
    get(): PreviewPanelPort | undefined {
        return ReactPreviewPanel.currentPanel
    }

    createOrShow(ctx: vscode.ExtensionContext, uri: vscode.Uri, log: Logger): PreviewPanelPort {
        return ReactPreviewPanel.createOrShow(ctx, uri, log)
    }

    dispose() {
        this.disposables.forEach(d => d.dispose())
    }
}
