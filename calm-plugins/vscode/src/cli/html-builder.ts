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
    template: 'preview.html' | 'preview-react.html'
    scriptPath: string[]
    styleFile?: string
}

const DEFAULT_ENTRY: HtmlEntry = {
    template: 'preview.html',
    scriptPath: ['dist', 'webview', 'main.global.js'],
    styleFile: 'preview.css',
}

export class HtmlBuilder {
    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Build the HTML body for a webview panel. Defaults to the legacy vanilla
     * DOM preview; the React preview panel passes its own entry.
     */
    getHtml(panel: vscode.WebviewPanel, entry: HtmlEntry = DEFAULT_ENTRY) {
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
        const styleUri = entry.styleFile
            ? webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', entry.styleFile))
            : ''
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', entry.template)
        let html = fs.readFileSync(htmlPath.fsPath, 'utf8')
        html = html
            .replace(/{{cspSource}}/g, webview.cspSource)
            .replace(/{{styleUri}}/g, String(styleUri))
            .replace(/{{scriptUri}}/g, String(scriptUri))
            .replace(/{{nonce}}/g, nonce)
            .replace(/{{version}}/g, version)
        return html
    }
}
