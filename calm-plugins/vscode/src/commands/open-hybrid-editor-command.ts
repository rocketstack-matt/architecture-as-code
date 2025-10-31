import * as vscode from 'vscode'
import type { ApplicationStoreApi } from '../application-store'

export function createOpenHybridEditorCommand(_store: ApplicationStoreApi) {
    return vscode.commands.registerCommand('calm.openHybridEditor', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.')
            return
        }

        const document = editor.document
        
        // Close the current editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
        
        // Open with the hybrid editor
        await vscode.commands.executeCommand(
            'vscode.openWith',
            document.uri,
            'calm.hybridEditor'
        )
    })
}
