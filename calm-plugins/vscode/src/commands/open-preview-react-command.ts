import * as vscode from 'vscode'
import { ReactPreviewPanel } from '../features/preview/react-preview-panel'
import type { Logger } from '../core/ports/logger'

/**
 * Opens the experimental React-based preview panel for the active CALM
 * document. Sits alongside the legacy `calm.openPreview` command during the
 * migration to the shared @finos/calm-ui-react component tree.
 */
export function createOpenPreviewReactCommand(
    context: vscode.ExtensionContext,
    log: Logger,
): vscode.Disposable {
    return vscode.commands.registerCommand('calm.openPreviewReact', () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            void vscode.window.showWarningMessage('Open a CALM document first.')
            return
        }
        ReactPreviewPanel.createOrShow(context, editor.document.uri, log)
    })
}
