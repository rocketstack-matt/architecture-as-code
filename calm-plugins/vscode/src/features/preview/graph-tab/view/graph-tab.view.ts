import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import { CalmReactFlowGraph } from '@finos/calm-widgets/reactflow'
import type { GraphViewModel } from '../view-model/graph.view-model'
import type { VsCodeApi } from '../../webview/panel.view-model'

/**
 * GraphTabView - Mounts the ReactFlow-based CalmReactFlowGraph into the
 * webview DOM. Manages the React lifecycle (create / update / unmount).
 */
export class GraphTabView {
    private viewModel: GraphViewModel
    private container: HTMLElement
    private vscode: VsCodeApi
    private root: Root | null = null

    constructor(viewModel: GraphViewModel, container: HTMLElement, vscode: VsCodeApi) {
        this.viewModel = viewModel
        this.container = container
        this.vscode = vscode
        this.bindViewModel()
    }

    private bindViewModel(): void {
        this.viewModel.onVMChanged((vm) => {
            this.render(vm)
        })
    }

    private render(vm: any): void {
        this.vscode.postMessage({ type: 'log', message: `[graph-view] render called, vm=${vm ? 'present' : 'null'}, container=${this.container.offsetWidth}x${this.container.offsetHeight}` })

        if (!vm) {
            if (this.root) {
                this.root.unmount()
                this.root = null
            }
            this.container.innerHTML = '<em>No architecture data to display. Open a CALM file and switch to the Graph tab.</em>'
            return
        }

        try {
            if (!this.root) {
                this.root = createRoot(this.container)
            }

            this.root.render(
                React.createElement(CalmReactFlowGraph, {
                    vm,
                    onNodeClick: (node: any) => {
                        const id = node?.id || node?.['unique-id']
                        if (id) {
                            this.vscode.postMessage({ type: 'selected', id })
                        }
                    },
                    onEdgeClick: (edge: any) => {
                        const id = edge?.id || edge?.['unique-id']
                        if (id) {
                            this.vscode.postMessage({ type: 'selected', id })
                        }
                    },
                })
            )
            this.vscode.postMessage({ type: 'log', message: '[graph-view] React render called successfully' })
        } catch (e: any) {
            this.vscode.postMessage({ type: 'error', message: `[graph-view] render error: ${e?.message}`, stack: e?.stack })
        }
    }

    /**
     * Update the view when external selection changes.
     */
    public updateSelection(selectedId?: string): void {
        this.viewModel.setSelectedId(selectedId)
    }

    /**
     * Cleanup React tree and event listeners.
     */
    public dispose(): void {
        if (this.root) {
            this.root.unmount()
            this.root = null
        }
        this.container.innerHTML = ''
    }
}
