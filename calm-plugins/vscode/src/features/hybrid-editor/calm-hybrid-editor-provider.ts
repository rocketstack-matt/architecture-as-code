import * as vscode from 'vscode'
import { HtmlBuilder } from '../../cli/html-builder'
import { Logger } from '../../core/ports/logger'
import { ModelService } from '../../core/services/model-service'

/**
 * Custom Text Editor Provider for CALM files that provides a hybrid view
 * with tabs for Source and Preview
 */
export class CalmHybridEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'calm.hybridEditor'
    private modelService: ModelService

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly htmlBuilder: HtmlBuilder,
        private readonly log: Logger
    ) {
        this.modelService = new ModelService()
    }

    public static register(
        context: vscode.ExtensionContext,
        htmlBuilder: HtmlBuilder,
        log: Logger
    ): vscode.Disposable {
        const provider = new CalmHybridEditorProvider(context, htmlBuilder, log)
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            CalmHybridEditorProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
        return providerRegistration
    }

    /**
     * Called when a custom editor is opened
     */
    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.log.info(`[hybrid-editor] Opening hybrid editor for: ${document.uri.fsPath}`)

        // Configure webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'templates'),
                ...(vscode.workspace.workspaceFolders || []).map(folder => folder.uri),
            ],
        }

        // Set the HTML content for the webview
        webviewPanel.webview.html = this.getHybridEditorHtml(webviewPanel.webview)

        // Handle messages from the webview
        const messageDisposable = webviewPanel.webview.onDidReceiveMessage(
            message => this.handleMessage(document, webviewPanel, message)
        )

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(document, webviewPanel.webview)
            }
        })

        // Clean up when editor is closed
        webviewPanel.onDidDispose(() => {
            messageDisposable.dispose()
            changeDocumentSubscription.dispose()
        })

        // Send initial content to webview
        this.updateWebview(document, webviewPanel.webview)
    }

    private getHybridEditorHtml(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'hybrid-editor.css')
        )

        const nonce = this.getNonce()

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none';
        img-src ${webview.cspSource} blob: data: vscode-resource: vscode-webview-resource: https:;
        style-src ${webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
        font-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>CALM Hybrid Editor</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-editor-foreground);
            background: var(--vscode-editor-background);
        }
        .tab-bar {
            display: flex;
            border-bottom: 1px solid var(--vscode-editorWidget-border);
            background: var(--vscode-editorGroupHeader-tabsBackground);
        }
        .tab {
            padding: 8px 16px;
            cursor: pointer;
            border: none;
            background: transparent;
            color: var(--vscode-tab-inactiveForeground);
            border-bottom: 2px solid transparent;
            font-size: 13px;
        }
        .tab:hover {
            background: var(--vscode-tab-hoverBackground);
        }
        .tab.active {
            color: var(--vscode-tab-activeForeground);
            background: var(--vscode-tab-activeBackground);
            border-bottom-color: var(--vscode-tab-activeBorderTop);
        }
        .tab-content {
            display: none;
            height: calc(100vh - 40px);
            overflow: auto;
        }
        .tab-content.active {
            display: block;
        }
        .source-editor {
            padding: 16px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        .source-editor textarea {
            width: 100%;
            height: 100%;
            min-height: 500px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border: 1px solid var(--vscode-editorWidget-border);
            padding: 8px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            resize: vertical;
        }
        #preview-content {
            padding: 16px;
        }
    </style>
</head>
<body>
    <div class="tab-bar">
        <button class="tab active" data-tab="source">Source</button>
        <button class="tab" data-tab="preview">Preview</button>
    </div>
    
    <div id="source-tab" class="tab-content active">
        <div class="source-editor">
            <textarea id="source-text" spellcheck="false"></textarea>
        </div>
    </div>
    
    <div id="preview-tab" class="tab-content">
        <div id="preview-content">
            <p>Loading preview...</p>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                switchTab(tabName);
            });
        });
        
        function switchTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
            });
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === tabName + '-tab');
            });
            
            // Request preview update if switching to preview tab
            if (tabName === 'preview') {
                vscode.postMessage({ type: 'requestPreview' });
            }
        }
        
        // Handle text changes in source editor
        const sourceText = document.getElementById('source-text');
        let updateTimeout;
        sourceText.addEventListener('input', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                vscode.postMessage({
                    type: 'updateSource',
                    content: sourceText.value
                });
            }, 500);
        });
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'update':
                    sourceText.value = message.content;
                    break;
                case 'preview':
                    document.getElementById('preview-content').innerHTML = message.html;
                    break;
            }
        });
    </script>
</body>
</html>`
    }

    private getNonce(): string {
        let text = ''
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length))
        }
        return text
    }

    private updateWebview(document: vscode.TextDocument, webview: vscode.Webview) {
        webview.postMessage({
            type: 'update',
            content: document.getText(),
        })
    }

    private handleMessage(
        document: vscode.TextDocument,
        panel: vscode.WebviewPanel,
        message: any
    ) {
        switch (message.type) {
            case 'updateSource':
                this.updateTextDocument(document, message.content)
                break
            case 'requestPreview':
                this.generatePreview(document, panel.webview)
                break
        }
    }

    private updateTextDocument(document: vscode.TextDocument, content: string) {
        const edit = new vscode.WorkspaceEdit()
        
        // Replace entire document content
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        )
        
        vscode.workspace.applyEdit(edit)
    }

    private async generatePreview(document: vscode.TextDocument, webview: vscode.Webview) {
        try {
            const content = document.getText()
            let previewHtml = '<div style="padding: 16px;">'
            
            try {
                // Parse the CALM model
                const modelData = this.modelService.readModel(document.uri.fsPath)
                
                // Create a simple preview showing the model structure
                previewHtml += '<h3>CALM Model Preview</h3>'
                
                // Show nodes
                if (modelData?.nodes && Array.isArray(modelData.nodes)) {
                    previewHtml += '<h4>Nodes (' + modelData.nodes.length + ')</h4>'
                    previewHtml += '<ul style="list-style: none; padding-left: 0;">'
                    for (const node of modelData.nodes.slice(0, 10)) {
                        const nodeId = node['unique-id'] || node.name || 'Unknown'
                        const nodeType = node['node-type'] || 'unknown'
                        previewHtml += `<li style="margin-bottom: 8px;">
                            <strong>${this.escapeHtml(nodeId)}</strong> 
                            <span style="color: var(--vscode-descriptionForeground); font-size: 0.9em;">(${this.escapeHtml(nodeType)})</span>
                        </li>`
                    }
                    if (modelData.nodes.length > 10) {
                        previewHtml += `<li style="color: var(--vscode-descriptionForeground);">... and ${modelData.nodes.length - 10} more</li>`
                    }
                    previewHtml += '</ul>'
                }
                
                // Show relationships
                if (modelData?.relationships && Array.isArray(modelData.relationships)) {
                    previewHtml += '<h4>Relationships (' + modelData.relationships.length + ')</h4>'
                    previewHtml += '<ul style="list-style: none; padding-left: 0;">'
                    for (const rel of modelData.relationships.slice(0, 5)) {
                        const relId = rel['unique-id'] || 'Unknown'
                        const relType = rel['relationship-type']?.connects || 'unknown'
                        previewHtml += `<li style="margin-bottom: 8px;">
                            <strong>${this.escapeHtml(relId)}</strong>
                            <span style="color: var(--vscode-descriptionForeground); font-size: 0.9em;">(${this.escapeHtml(relType)})</span>
                        </li>`
                    }
                    if (modelData.relationships.length > 5) {
                        previewHtml += `<li style="color: var(--vscode-descriptionForeground);">... and ${modelData.relationships.length - 5} more</li>`
                    }
                    previewHtml += '</ul>'
                }
                
                // Show flows
                if (modelData?.flows && Array.isArray(modelData.flows)) {
                    previewHtml += '<h4>Flows (' + modelData.flows.length + ')</h4>'
                    previewHtml += '<ul style="list-style: none; padding-left: 0;">'
                    for (const flow of modelData.flows.slice(0, 5)) {
                        const flowId = flow['unique-id'] || 'Unknown'
                        previewHtml += `<li style="margin-bottom: 8px;"><strong>${this.escapeHtml(flowId)}</strong></li>`
                    }
                    if (modelData.flows.length > 5) {
                        previewHtml += `<li style="color: var(--vscode-descriptionForeground);">... and ${modelData.flows.length - 5} more</li>`
                    }
                    previewHtml += '</ul>'
                }
                
                // Add a note about using the classic preview for full visualization
                previewHtml += `<div style="margin-top: 24px; padding: 12px; background: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-textLink-foreground);">
                    <strong>💡 Tip:</strong> Use <code>CALM: Open Preview</code> command for full diagram visualization with Mermaid rendering.
                </div>`
                
                previewHtml += '</div>'
            } catch (e) {
                previewHtml += `<p style="color: var(--vscode-errorForeground);">Error parsing CALM model: ${e instanceof Error ? this.escapeHtml(e.message) : String(e)}</p>`
                previewHtml += `<pre style="background: var(--vscode-textCodeBlock-background); padding: 16px; border-radius: 4px; overflow: auto;">${this.escapeHtml(content)}</pre>`
                previewHtml += '</div>'
            }
            
            webview.postMessage({
                type: 'preview',
                html: previewHtml,
            })
        } catch (error) {
            this.log.error?.(`[hybrid-editor] Error generating preview: ${String(error)}`)
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
    }
}
