import * as vscode from 'vscode'
import type { HubConfigService } from '../features/hub/hub-config-service'
import type { HubTreeDataProvider } from '../features/hub/hub-tree-data-provider'
import type { Logger } from '../core/ports/logger'

/**
 * Registers `calm.signInToHub`, `calm.signOutOfHub`, and
 * `calm.refreshHub`. The bearer-token branch is wired up in this phase;
 * the device-code flow lands as a follow-on.
 */
export function createHubAuthCommands(
    config: HubConfigService,
    tree: HubTreeDataProvider,
    log: Logger,
): vscode.Disposable[] {
    return [
        vscode.commands.registerCommand('calm.signInToHub', async () => {
            const mode = config.getAuthMode()
            if (mode === 'none') {
                void vscode.window.showWarningMessage(
                    'CALM Hub auth mode is "none". Set calm.hub.auth.mode to "bearer" to sign in.',
                )
                return
            }
            if (mode === 'device-code') {
                void vscode.window.showInformationMessage(
                    'Device-code sign-in is not yet implemented — set calm.hub.auth.mode to "bearer" for now.',
                )
                return
            }
            const token = await vscode.window.showInputBox({
                title: 'Sign in to CALM Hub',
                prompt: 'Bearer token (PAT)',
                password: true,
                ignoreFocusOut: true,
            })
            if (!token) return
            await config.writeToken(token)
            tree.refresh()
            log.info?.('[hub] Bearer token stored; Hub view refreshed')
            void vscode.window.showInformationMessage('Signed in to CALM Hub.')
        }),
        vscode.commands.registerCommand('calm.signOutOfHub', async () => {
            await config.clearToken()
            tree.refresh()
            log.info?.('[hub] Bearer token cleared')
            void vscode.window.showInformationMessage('Signed out of CALM Hub.')
        }),
        vscode.commands.registerCommand('calm.refreshHub', () => {
            tree.refresh()
        }),
    ]
}
