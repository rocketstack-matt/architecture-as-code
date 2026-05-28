import * as vscode from 'vscode'
import type { HubConfigService } from './hub-config-service'
import type { HubDataSource } from './hub-data-source'
import { HubCache } from './hub-cache'

/**
 * One node in the calmHubSidebar tree. Keys uniquely identify the row in the
 * TreeView so VSCode can preserve expand/collapse state. The shape mirrors the
 * Hub UI's TreeNavigation: namespace → calmType group → resource → version.
 */
type HubNode =
    | { kind: 'status' }
    | { kind: 'namespace'; namespace: string }
    | { kind: 'group'; namespace: string; calmType: HubCalmType }
    | { kind: 'resource'; namespace: string; calmType: HubCalmType; id: string; label: string; description?: string }
    | { kind: 'version'; namespace: string; calmType: HubCalmType; id: string; version: string; label: string }

type HubCalmType = 'Architectures' | 'Patterns' | 'Flows' | 'Standards' | 'ADRs'
const TYPE_GROUPS: HubCalmType[] = ['Architectures', 'Patterns', 'Flows', 'Standards', 'ADRs']

/**
 * Backs the `calmHubSidebar` view. Lazy: namespaces fetch on first expansion,
 * resources fetch when their type group expands, versions fetch when a
 * specific resource expands. Errors surface as inline error rows so the
 * activity-bar view remains navigable even when the Hub is unreachable.
 */
export class HubTreeDataProvider implements vscode.TreeDataProvider<HubNode>, vscode.Disposable {
    private readonly _emitter = new vscode.EventEmitter<HubNode | undefined | void>()
    readonly onDidChangeTreeData = this._emitter.event

    private disposables: vscode.Disposable[] = []
    private cache = new HubCache(60_000)

    constructor(
        private config: HubConfigService,
        private dataSource: HubDataSource,
    ) {
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('calm.hub')) this.refresh()
            }),
        )
    }

    refresh(): void {
        this.cache.invalidate()
        this._emitter.fire()
    }

    getTreeItem(element: HubNode): vscode.TreeItem {
        switch (element.kind) {
        case 'status': {
            const url = this.config.getBaseUrl()
            const label = url ?? 'CALM Hub disabled — set calm.hub.url'
            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None)
            item.iconPath = new vscode.ThemeIcon(url ? 'cloud' : 'cloud-offline')
            item.contextValue = 'hub.status'
            return item
        }
        case 'namespace': {
            const item = new vscode.TreeItem(element.namespace, vscode.TreeItemCollapsibleState.Collapsed)
            item.iconPath = new vscode.ThemeIcon('folder')
            item.contextValue = 'hub.namespace'
            return item
        }
        case 'group': {
            const item = new vscode.TreeItem(element.calmType, vscode.TreeItemCollapsibleState.Collapsed)
            item.iconPath = new vscode.ThemeIcon(iconForType(element.calmType))
            item.contextValue = `hub.group.${element.calmType.toLowerCase()}`
            return item
        }
        case 'resource': {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed)
            item.description = element.description
            item.iconPath = new vscode.ThemeIcon(iconForType(element.calmType))
            item.contextValue = `hub.resource.${element.calmType.toLowerCase()}`
            item.tooltip = `${element.namespace}/${element.calmType}/${element.label}`
            return item
        }
        case 'version': {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None)
            item.iconPath = new vscode.ThemeIcon('tag')
            item.contextValue = `hub.version.${element.calmType.toLowerCase()}`
            item.command = {
                command: 'calm.openFromHub',
                title: 'Open from Hub',
                arguments: [{
                    kind: 'hub',
                    namespace: element.namespace,
                    calmType: element.calmType,
                    id: element.id,
                    version: element.version,
                }],
            }
            return item
        }
        }
    }

    async getChildren(element?: HubNode): Promise<HubNode[]> {
        if (!this.config.isEnabled()) {
            return element ? [] : [{ kind: 'status' }]
        }
        if (!element) {
            const namespaces = await this.safeFetch(
                () => this.cache.get('namespaces', () => this.dataSource.listNamespaces()),
                'Failed to load namespaces',
            )
            const pinned = new Set(this.config.getPinnedNamespaces())
            const sorted = [...namespaces].sort((a, b) => {
                const ap = pinned.has(a) ? 0 : 1
                const bp = pinned.has(b) ? 0 : 1
                if (ap !== bp) return ap - bp
                return a.localeCompare(b)
            })
            return [
                { kind: 'status' },
                ...sorted.map<HubNode>((namespace) => ({ kind: 'namespace', namespace })),
            ]
        }
        if (element.kind === 'namespace') {
            return TYPE_GROUPS.map<HubNode>((calmType) => ({
                kind: 'group',
                namespace: element.namespace,
                calmType,
            }))
        }
        if (element.kind === 'group') {
            return this.loadGroupChildren(element.namespace, element.calmType)
        }
        if (element.kind === 'resource') {
            return this.loadVersions(element)
        }
        return []
    }

    private async loadGroupChildren(namespace: string, calmType: HubCalmType): Promise<HubNode[]> {
        const cacheKey = `ns:${namespace}/${calmType}`
        const fetch = (): Promise<{ id: string; label: string; description?: string }[]> => {
            switch (calmType) {
            case 'Architectures':
                return this.dataSource.listArchitectures(namespace).then(toResourceShape)
            case 'Patterns':
                return this.dataSource.listPatterns(namespace).then(toResourceShape)
            case 'Flows':
                return this.dataSource.listFlows(namespace).then(toResourceShape)
            case 'Standards':
                return this.dataSource.listStandards(namespace).then(toResourceShape)
            case 'ADRs':
                return this.dataSource.listAdrs(namespace).then((items) =>
                    items.map((a) => ({ id: String(a.id), label: a.title, description: a.status })),
                )
            }
        }
        const resources = await this.safeFetch(
            () => this.cache.get(cacheKey, fetch),
            `Failed to load ${calmType} for ${namespace}`,
        )
        return resources.map<HubNode>((r) => ({
            kind: 'resource',
            namespace,
            calmType,
            id: r.id,
            label: r.label,
            description: r.description,
        }))
    }

    private async loadVersions(element: Extract<HubNode, { kind: 'resource' }>): Promise<HubNode[]> {
        const cacheKey = `versions:${element.namespace}/${element.calmType}/${element.id}`
        const versions = await this.safeFetch(
            () => this.cache.get(cacheKey, () => this.dataSource.loadVersionList({
                kind: 'hub',
                namespace: element.namespace,
                calmType: element.calmType === 'Patterns' ? 'Patterns' : 'Architectures',
                id: element.id,
                version: '',
            })),
            `Failed to load versions for ${element.label}`,
        )
        return versions.map<HubNode>((version) => ({
            kind: 'version',
            namespace: element.namespace,
            calmType: element.calmType,
            id: element.id,
            version,
            label: version,
        }))
    }

    private async safeFetch<T>(fn: () => Promise<T[]>, errorMessage: string): Promise<T[]> {
        try {
            return await fn()
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            void vscode.window.showWarningMessage(`${errorMessage}: ${msg}`)
            return []
        }
    }

    dispose(): void {
        this.disposables.forEach((d) => d.dispose())
        this._emitter.dispose()
    }
}

function iconForType(calmType: HubCalmType): string {
    switch (calmType) {
    case 'Architectures':
        return 'circuit-board'
    case 'Patterns':
        return 'symbol-structure'
    case 'Flows':
        return 'arrow-swap'
    case 'Standards':
        return 'shield'
    case 'ADRs':
        return 'book'
    }
}

function toResourceShape(items: { id: number | string; name: string; description: string; customId?: string }[]) {
    return items.map((r) => ({
        id: r.customId ?? String(r.id),
        label: r.name,
        description: r.description,
    }))
}
