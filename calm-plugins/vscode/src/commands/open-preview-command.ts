import * as vscode from 'vscode'
import { detectFileType, FileType } from '../models/file-types'
import type { ApplicationStoreApi } from '../application-store'
import { ReactPreviewPanel } from '../features/preview/react-preview-panel'
import type { Logger } from '../core/ports/logger'

/**
 * Picks between the React preview (default) and the legacy vanilla-DOM
 * docify/template preview based on the `calm.preview.engine` setting.
 *
 * The React preview shows the architecture diagram + details sidebar shared
 * with Hub UI. The legacy preview hosts the docify, template, and model
 * tabs that pre-date the shared component lift. Both are kept available
 * during the transition; subsequent phases prune the legacy code path
 * once the React preview covers its features end-to-end.
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

        const engine = vscode.workspace.getConfiguration('calm').get<string>('preview.engine', 'react')

        if (engine === 'react' && isArchitecture) {
            // React preview only supports architecture files in this phase.
            // Template and timeline files fall through to the legacy preview
            // until the React path grows feature parity for them.
            ReactPreviewPanel.createOrShow(context, doc.uri, log)
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
    })
}
