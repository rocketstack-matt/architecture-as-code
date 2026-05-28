import axios from 'axios'
import {
    AdrService,
    CalmService,
    isSlug,
    type Data,
    type ResourceSummary,
    type AdrSummary,
} from '@finos/calm-hub-client'
import type { CalmArchitectureSchema } from '@finos/calm-models/types'
import type {
    CalmDataSource,
    CalmDataSourceCapabilities,
    DecoratorRecord,
    DocRef,
    AdrEnvelope,
    CalmTimelineLike,
} from '@finos/calm-ui-react/adapters'
import type { HubAuthService } from './hub-auth-service'
import type { HubConfigService } from './hub-config-service'

/**
 * Implements the calm-ui-react CalmDataSource port against the Hub REST
 * client. The VSCode webview never makes HTTP calls itself; the extension
 * host owns this data source and routes requests by DocRef.kind. Local
 * documents continue to be served by the existing ModelService — the
 * webview's vscode-data-source adapter dispatches the right path on the
 * host side.
 *
 * Each method instantiates a Hub client lazily so a sign-in mid-session
 * picks up the new token without re-creating the data source.
 */
export class HubDataSource implements CalmDataSource {
    readonly capabilities: CalmDataSourceCapabilities = {
        dropzone: false,
        httpDecorators: true,
        multiVersion: true,
    }

    constructor(
        private config: HubConfigService,
        private auth: HubAuthService,
    ) {}

    private requireHubRef(ref: DocRef): Extract<DocRef, { kind: 'hub' }> {
        if (ref.kind !== 'hub') {
            throw new Error(`HubDataSource only handles kind: 'hub' refs (got: ${ref.kind})`)
        }
        return ref
    }

    private newCalmService(): CalmService {
        const baseUrl = this.config.getBaseUrl()
        if (!baseUrl) throw new Error('Hub is not configured (calm.hub.url is empty)')
        const ax = axios.create({ baseURL: baseUrl })
        return new CalmService(ax, this.auth)
    }

    private newAdrService(): AdrService {
        const baseUrl = this.config.getBaseUrl()
        if (!baseUrl) throw new Error('Hub is not configured (calm.hub.url is empty)')
        const ax = axios.create({ baseURL: baseUrl })
        return new AdrService(ax, this.auth)
    }

    async loadArchitecture(ref: DocRef): Promise<CalmArchitectureSchema> {
        const hub = this.requireHubRef(ref)
        const svc = this.newCalmService()
        const result: Data = isSlug(hub.id)
            ? await svc.fetchResourceByCustomId(hub.namespace, hub.id, hub.version, hub.calmType)
            : hub.calmType === 'Patterns'
                ? await svc.fetchPattern(hub.namespace, hub.id, hub.version)
                : await svc.fetchArchitecture(hub.namespace, hub.id, hub.version)
        // The Hub returns either an architecture or pattern document; the
        // shared visualizer renders both via the same React tree.
        return (result.data as CalmArchitectureSchema) ?? ({ nodes: [], relationships: [] } as CalmArchitectureSchema)
    }

    async loadPattern(ref: DocRef): Promise<Record<string, unknown>> {
        const hub = this.requireHubRef(ref)
        const svc = this.newCalmService()
        const result = await svc.fetchPattern(hub.namespace, hub.id, hub.version)
        return (result.data as Record<string, unknown>) ?? {}
    }

    async loadAdr(ref: DocRef | string): Promise<AdrEnvelope> {
        const svc = this.newAdrService()
        // Accept either a Hub DocRef or a "{namespace}/{adrId}/{revision}"
        // string. The string form mirrors the local-file adapter so the
        // host's open-adr command can pass through Hub refs without
        // re-shaping them.
        let namespace: string
        let adrId: string
        let revision: string
        if (typeof ref === 'string') {
            const parts = ref.split('/')
            if (parts.length < 3) throw new Error(`Invalid Hub ADR ref: ${ref}`)
            ;[namespace, adrId, revision] = parts
        } else {
            const hub = this.requireHubRef(ref)
            namespace = hub.namespace
            adrId = hub.id
            revision = hub.version
        }
        const adr = await svc.fetchAdr(namespace, adrId, revision)
        return { adr } as AdrEnvelope
    }

    async loadDecorators(
        namespace: string,
        target: string,
        kind: 'deployment',
    ): Promise<DecoratorRecord[]> {
        const svc = this.newCalmService()
        return svc.fetchDecoratorValues(namespace, target, kind) as Promise<DecoratorRecord[]>
    }

    async loadTimeline(ref: DocRef): Promise<CalmTimelineLike | undefined> {
        const hub = this.requireHubRef(ref)
        const svc = this.newCalmService()
        return svc.fetchArchitectureTimeline(hub.namespace, hub.id)
    }

    async loadVersionList(ref: DocRef): Promise<string[]> {
        const hub = this.requireHubRef(ref)
        const svc = this.newCalmService()
        if (isSlug(hub.id)) return svc.fetchVersionsByCustomId(hub.namespace, hub.id)
        return hub.calmType === 'Patterns'
            ? svc.fetchPatternVersions(hub.namespace, hub.id)
            : svc.fetchArchitectureVersions(hub.namespace, hub.id)
    }

    // Helpers the tree-view will use directly (not part of CalmDataSource).
    async listNamespaces(): Promise<string[]> {
        return this.newCalmService().fetchNamespaces()
    }
    async listArchitectures(namespace: string): Promise<ResourceSummary[]> {
        return this.newCalmService().fetchArchitectureSummaries(namespace)
    }
    async listPatterns(namespace: string): Promise<ResourceSummary[]> {
        return this.newCalmService().fetchPatternSummaries(namespace)
    }
    async listFlows(namespace: string): Promise<ResourceSummary[]> {
        return this.newCalmService().fetchFlowSummaries(namespace)
    }
    async listStandards(namespace: string): Promise<ResourceSummary[]> {
        return this.newCalmService().fetchStandardSummaries(namespace)
    }
    async listAdrs(namespace: string): Promise<AdrSummary[]> {
        return this.newAdrService().fetchAdrSummaries(namespace)
    }
}
