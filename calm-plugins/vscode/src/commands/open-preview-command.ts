import * as vscode from 'vscode'
import { detectFileType, FileType } from '../models/file-types'
import type { ApplicationStoreApi } from '../application-store'
import { ReactPreviewPanel } from '../features/preview/react-preview-panel'
import type { Logger } from '../core/ports/logger'

/**
 * `calm.openPreview` — opens the ReactFlow preview shared with Hub UI.
 *
 * The command updates the application store with the new document URI,
 * template mode (when applicable), and any incoming elementId. For
 * architecture files it also drives the React preview directly so the
 * panel appears even when the StoreReactionMediator's `forceCreatePreview`
 * pathway has been short-circuited (e.g. by tests).
 */
export function createOpenPreviewCommand(
    store: ApplicationStoreApi,
    context: vscode.ExtensionContext,
    log: Logger,
) {
    return vscode.commands.registerCommand('calm.openPreview', async (elementId?: string) => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const doc = editor.document
        const fileInfo = detectFileType(doc.uri.fsPath)

        const isArchitecture = fileInfo.type === FileType.ArchitectureFile && fileInfo.isValid
        const isTemplate = fileInfo.type === FileType.TemplateFile && fileInfo.isValid
        const isTimeline = fileInfo.type === FileType.TimelineFile && fileInfo.isValid
        if (!isArchitecture && !isTemplate && !isTimeline) {
            vscode.window.showWarningMessage('This file is not a CALM architecture, timeline, or template file.')
            return
        }

        const state = store.getState()
        state.setCurrentDocument(doc.uri)

        if (isTemplate) {
            state.setTemplateMode(true, doc.uri.fsPath, fileInfo.architecturePath)
        } else {
            state.setTemplateMode(false)
        }

        if (elementId && typeof elementId === 'string') {
            state.setSelectedElement(elementId)
        }

        state.setForceCreatePreview(true)

        // Architecture files also get the React preview opened directly so the
        // panel appears even outside the store-reaction-mediator's normal flow.
        if (isArchitecture) {
            ReactPreviewPanel.createOrShow(context, doc.uri, log)
        }
    })
}
