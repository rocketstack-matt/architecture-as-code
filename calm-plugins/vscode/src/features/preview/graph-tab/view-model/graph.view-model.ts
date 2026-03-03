import { Emitter } from '../../../../core/emitter'

/**
 * BlockArchVM type - kept loose here since the actual VM is built on the
 * extension side (Node environment) and serialized over postMessage.
 */
type BlockArchVM = Record<string, any>

/**
 * GraphViewModel - Framework-free ViewModel for the interactive graph tab.
 * Receives a pre-built BlockArchVM from the extension host and exposes it
 * to the view layer for ReactFlow rendering.
 */
export class GraphViewModel {
    private vmChangedEmitter = new Emitter<BlockArchVM | null>()
    private selectionChangedEmitter = new Emitter<string | undefined>()
    private graphDataRequestEmitter = new Emitter<void>()

    private currentVM: BlockArchVM | null = null
    private selectedId: string | undefined

    // Events
    onVMChanged = this.vmChangedEmitter.event
    onSelectionChanged = this.selectionChangedEmitter.event
    onGraphDataRequest = this.graphDataRequestEmitter.event

    /**
     * Receive the pre-built BlockArchVM from the extension host.
     */
    setGraphData(vm: BlockArchVM | null): void {
        this.currentVM = vm || null
        this.vmChangedEmitter.fire(this.currentVM)
    }

    /**
     * Get the current BlockArchVM.
     */
    getVM(): BlockArchVM | null {
        return this.currentVM
    }

    /**
     * Set selected element ID.
     */
    setSelectedId(id: string | undefined): void {
        if (this.selectedId !== id) {
            this.selectedId = id
            this.selectionChangedEmitter.fire(id)
        }
    }

    /**
     * Get selected element ID.
     */
    getSelectedId(): string | undefined {
        return this.selectedId
    }

    /**
     * Request graph data from the extension host.
     */
    requestGraphData(): void {
        this.graphDataRequestEmitter.fire()
    }

    /**
     * Check if the VM has been built.
     */
    hasData(): boolean {
        return this.currentVM !== null
    }

    /**
     * Get state for debugging.
     */
    getState() {
        return {
            hasData: this.hasData(),
            selectedId: this.selectedId,
        }
    }

    /**
     * Reset all state.
     */
    reset(): void {
        this.currentVM = null
        this.selectedId = undefined
        this.vmChangedEmitter.fire(null)
        this.selectionChangedEmitter.fire(undefined)
    }

    /**
     * Dispose all emitters.
     */
    dispose(): void {
        this.vmChangedEmitter.dispose()
        this.selectionChangedEmitter.dispose()
        this.graphDataRequestEmitter.dispose()
    }
}
