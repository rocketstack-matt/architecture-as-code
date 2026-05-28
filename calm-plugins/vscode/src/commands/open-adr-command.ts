import * as vscode from 'vscode'
import { AdrPanel } from '../features/adr/adr-panel'
import type { Logger } from '../core/ports/logger'

/**
 * `calm.openAdr` — opens an ADR document in a webview rendered by the
 * shared @finos/calm-ui-react AdrView. The argument is the ADR reference
 * (file path or relative path) as stored in the architecture's `adrs[]`
 * array.
 *
 * Invoked by:
 *  - the calmSidebar TreeView when the user activates an ADR row
 *  - the command palette (asks the user for a reference)
 */
export function createOpenAdrCommand(
    context: vscode.ExtensionContext,
    log: Logger,
): vscode.Disposable {
    return vscode.commands.registerCommand('calm.openAdr', async (refArg?: unknown) => {
        let ref = typeof refArg === 'string' ? refArg : undefined
        if (!ref) {
            ref = await vscode.window.showInputBox({
                title: 'Open ADR',
                prompt: 'Path to the ADR JSON file (absolute or workspace-relative)',
                ignoreFocusOut: true,
            })
        }
        if (!ref) return
        AdrPanel.createOrShow(context, ref, log)
    })
}
