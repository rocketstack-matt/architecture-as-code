import { CalmModelViewModel } from '../model-tab/view-model/calm-model.view-model'
import { TemplateViewModel } from '../template-tab/view-model/template.view-model'
import { DocifyViewModel } from '../docify-tab/view-model/docify.view-model'
import { GraphViewModel } from '../graph-tab/view-model/graph.view-model'

export interface VsCodeApi {
    postMessage(msg: any): void;
}

/**
 * TabsViewModel - Manages tab selection and coordinates child tab ViewModels
 */
export class TabsViewModel {
    private activeTab: 'docify-panel' | 'template-panel' | 'model-panel' = 'docify-panel'
    private renderer: 'mermaid' | 'reactflow' = 'mermaid'

    // Child ViewModels
    public readonly model = new CalmModelViewModel()
    public readonly template = new TemplateViewModel()
    public readonly docify = new DocifyViewModel()
    public readonly graph = new GraphViewModel()
    public readonly vscode: VsCodeApi

    // Observer callbacks
    public onTabChanged: (tabId: string) => void = () => { }
    public onRendererChanged: (renderer: 'mermaid' | 'reactflow') => void = () => { }

    constructor(vscode: VsCodeApi) {
        this.vscode = vscode
    }

    setRenderer(renderer: 'mermaid' | 'reactflow'): void {
        const changed = this.renderer !== renderer
        this.renderer = renderer
        if (changed) {
            this.onRendererChanged(renderer)
        }
        // Always request data for the docify tab (handles initial load and changes)
        if (this.activeTab === 'docify-panel') {
            this.requestDocifyData()
        }
    }

    getRenderer(): 'mermaid' | 'reactflow' {
        return this.renderer
    }

    setActiveTab(tabId: 'docify-panel' | 'template-panel' | 'model-panel'): void {
        if (this.activeTab !== tabId) {
            this.activeTab = tabId
            this.onTabChanged(tabId)

            // Request data when switching tabs
            if (tabId === 'docify-panel') this.requestDocifyData()
            if (tabId === 'template-panel') this.vscode.postMessage({ type: 'requestTemplateData' })
            if (tabId === 'model-panel') this.vscode.postMessage({ type: 'requestModelData' })
        }
    }

    /** Request appropriate data for the Docify tab based on renderer setting */
    private requestDocifyData(): void {
        if (this.renderer === 'reactflow') {
            this.vscode.postMessage({ type: 'requestGraphData' })
        } else {
            this.vscode.postMessage({ type: 'runDocify' })
        }
    }

    getActiveTab(): string {
        return this.activeTab
    }

    isActiveTab(tabId: string): boolean {
        return this.activeTab === tabId
    }

    // Handle incoming messages and route to appropriate child ViewModel
    handleMessage(msg: any): void {
        switch (msg.type) {
            case 'modelData':
                if (msg.data) {
                    // Update model ViewModel with data
                    this.model.setModelData(msg.data)
                }
                break
            case 'graphData':
                if (msg.data) {
                    // Update graph ViewModel with canonical model data
                    this.graph.setGraphData(msg.data)
                }
                break
            case 'templateData':
                if (msg.data) {
                    // Update template ViewModel with data
                    this.template.setTemplateContent(
                        msg.data.content || '',
                        msg.data.name || '',
                        msg.data.selectedId || 'none',
                        msg.data.isTemplateMode || false
                    )
                }
                break
            case 'templateMode':
                // Handle template mode changes from the backend
                this.template.setTemplateMode(
                    msg.isTemplateMode || false,
                    msg.templatePath,
                    msg.architecturePath
                )
                break
            case 'docifyResult':
                // Update docify ViewModel with result
                this.docify.setDocifyResult(msg.content, msg.format, msg.sourceFile)
                break
            case 'docifyError':
                // Update docify ViewModel with error
                this.docify.setDocifyError(msg.message)
                break
            case 'rendererSetting':
                this.setRenderer(msg.renderer === 'reactflow' ? 'reactflow' : 'mermaid')
                break
            case 'select':
                // Update all child ViewModels with selection
                this.model.setSelectedId(msg.id)
                this.template.setSelectedId(msg.id || 'none')
                this.graph.setSelectedId(msg.id || undefined)

                // Request fresh data for all tabs on selection change
                this.vscode.postMessage({ type: 'requestModelData' })
                this.vscode.postMessage({ type: 'requestTemplateData' })

                // If on docify tab, refresh with appropriate renderer
                if (this.activeTab === 'docify-panel') {
                    this.requestDocifyData()
                }
                break
        }
    }
}

/**
 * PanelViewModel - Main ViewModel that coordinates tabs
 * Note: Header is template-based with {{version}} interpolation, no dynamic ViewModel needed
 */
export class PanelViewModel {
    public readonly tabs = new TabsViewModel(this.vscode)

    constructor(private vscode: VsCodeApi) {
        // Set up message handling
        window.addEventListener('message', (event) => {
            this.handleMessage(event.data)
        })
    }

    private handleMessage(msg: any): void {
        // Forward messages to tabs ViewModel (header is static template-based)
        this.tabs.handleMessage(msg)
    }

    /**
     * Initialize the panel
     */
    initialize(): void {
        // Signal that webview is ready — extension host will respond with rendererSetting
        // and initial data
        this.vscode.postMessage({ type: 'ready' })
    }
}