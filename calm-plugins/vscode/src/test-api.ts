import { ReactPreviewPanel } from './features/preview/react-preview-panel'
import { PreviewPanelFactory } from './features/preview/preview-panel-factory'

/**
 * Test-only API returned from `activate()` for use by @vscode/test-electron
 * integration tests. Not part of the extension's user-facing contract.
 *
 * Now that the React preview is the canonical implementation, the test API
 * is a thin wrapper around `ReactPreviewPanel`'s readiness signal — the
 * legacy "rendered" probe (which observed Mermaid's compositor) is gone
 * with the rest of the legacy preview.
 */
export interface CalmExtensionTestApi {
  /**
   * Resolves `true` when the preview webview posts its `ready` message
   * (JS executed + message listeners attached), or `false` on timeout.
   */
  waitForPreviewReady(timeoutMs?: number): Promise<boolean>
}

export function createTestApi(_factory: PreviewPanelFactory): CalmExtensionTestApi {
  return {
    waitForPreviewReady(timeoutMs = 5000) {
      const panel = ReactPreviewPanel.currentPanel
      if (panel?.isReady()) return Promise.resolve(true)
      if (!panel) return Promise.resolve(false)
      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          sub.dispose()
          resolve(false)
        }, timeoutMs)
        const sub = panel.onReady((ready) => {
          if (ready) {
            clearTimeout(timer)
            sub.dispose()
            resolve(true)
          }
        })
      })
    },
  }
}
