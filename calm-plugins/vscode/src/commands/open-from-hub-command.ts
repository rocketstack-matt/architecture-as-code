import * as vscode from 'vscode'
import { ReactPreviewPanel } from '../features/preview/react-preview-panel'
import type { HubDataSource } from '../features/hub/hub-data-source'
import type { Logger } from '../core/ports/logger'

interface HubDocRefArg {
    kind: 'hub'
    namespace: string
    calmType: 'Architectures' | 'Patterns' | 'Flows' | 'Standards' | 'ADRs'
    id: string
    version: string
}

function isHubRef(value: unknown): value is HubDocRefArg {
    return !!value
        && typeof value === 'object'
        && (value as { kind?: unknown }).kind === 'hub'
        && typeof (value as { namespace?: unknown }).namespace === 'string'
        && typeof (value as { id?: unknown }).id === 'string'
        && typeof (value as { version?: unknown }).version === 'string'
}

/**
 * Opens a Hub-hosted resource in the React preview. Invoked by the
 * calmHubSidebar tree view when the user activates a version row; carries
 * the full { namespace, calmType, id, version } tuple as its argument.
 */
export function createOpenFromHubCommand(
    context: vscode.ExtensionContext,
    dataSource: HubDataSource,
    log: Logger,
): vscode.Disposable {
    return vscode.commands.registerCommand('calm.openFromHub', async (refArg?: unknown) => {
        if (!isHubRef(refArg)) {
            void vscode.window.showWarningMessage('CALM: Open from Hub requires a Hub document reference.')
            return
        }
        const panel = ReactPreviewPanel.currentPanel
            ?? ReactPreviewPanel.createOrShow(context, vscode.Uri.parse('untitled:hub'), log)
        panel.revealHub(refArg, dataSource)
    })
}
