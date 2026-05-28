import * as vscode from 'vscode'
import * as fs from 'fs'

function getNonce() {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}

export interface HtmlEntry {
    template: 'preview-react.html' | 'adr.html'
    scriptPath: string[]
}

/**
 * Builds the CSP-compliant HTML shell served to a webview panel. The legacy
 * vanilla-DOM preview is gone, so the only callers are the React preview
 * (`preview-react.html`) and the ADR webview (`adr.html`).
 */
export class HtmlBuilder {
    constructor(private context: vscode.ExtensionContext) {}

    getHtml(panel: vscode.WebviewPanel, entry: HtmlEntry) {
        let version = 'unknown'
        try {
            const pkgUri = vscode.Uri.joinPath(this.context.extensionUri, 'package.json')
            const pkg = require(pkgUri.fsPath)
            if (pkg?.version) version = String(pkg.version)
        } catch { /* noop */ }
        const webview = panel.webview
        const nonce = getNonce()
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, ...entry.scriptPath),
        )
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', entry.template)
        let html = fs.readFileSync(htmlPath.fsPath, 'utf8')
        html = html
            .replace(/{{cspSource}}/g, webview.cspSource)
            .replace(/{{scriptUri}}/g, String(scriptUri))
            .replace(/{{nonce}}/g, nonce)
            .replace(/{{version}}/g, version)
        return html
    }
}
