import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HubDataSource } from './hub-data-source.js'
import type { HubConfigService } from './hub-config-service.js'
import type { HubAuthService } from './hub-auth-service.js'

vi.mock('@finos/calm-hub-client', () => {
    return {
        CalmService: vi.fn().mockImplementation(() => ({
            fetchArchitecture: vi.fn().mockResolvedValue({
                id: 'svc-1', version: '1.0.0', name: 'finos',
                calmType: 'Architectures',
                data: { nodes: [{ 'unique-id': 'n1' }], relationships: [] },
            }),
            fetchPattern: vi.fn().mockResolvedValue({
                id: 'pat-1', version: '1.0.0', name: 'finos',
                calmType: 'Patterns',
                data: { properties: { nodes: { prefixItems: [] } } },
            }),
            fetchArchitectureVersions: vi.fn().mockResolvedValue(['1.0.0', '1.1.0']),
            fetchPatternVersions: vi.fn().mockResolvedValue(['2.0.0']),
            fetchVersionsByCustomId: vi.fn().mockResolvedValue(['slug-v1']),
            fetchNamespaces: vi.fn().mockResolvedValue(['finos', 'acme']),
            fetchArchitectureSummaries: vi.fn().mockResolvedValue([
                { id: 1, name: 'TraderX', description: 'demo' },
            ]),
            fetchPatternSummaries: vi.fn().mockResolvedValue([]),
            fetchFlowSummaries: vi.fn().mockResolvedValue([]),
            fetchStandardSummaries: vi.fn().mockResolvedValue([]),
            fetchDecoratorValues: vi.fn().mockResolvedValue([]),
            fetchArchitectureTimeline: vi.fn().mockResolvedValue(undefined),
            fetchResourceByCustomId: vi.fn().mockResolvedValue({
                id: 'slug', version: 'slug-v1', name: 'finos',
                calmType: 'Architectures', data: { nodes: [] },
            }),
        })),
        AdrService: vi.fn().mockImplementation(() => ({
            fetchAdrSummaries: vi.fn().mockResolvedValue([{ id: 1, title: 'ADR-1', status: 'accepted' }]),
            fetchAdr: vi.fn().mockResolvedValue({ title: 'ADR-1' }),
        })),
        isSlug: (id: string) => !/^\d+$/.test(id),
    }
})

function makeConfig(baseUrl: string = 'http://localhost:8080'): HubConfigService {
    return {
        getBaseUrl: () => baseUrl,
        getAuthMode: () => 'none',
        getPinnedNamespaces: () => [],
        readToken: async () => undefined,
        writeToken: async () => undefined,
        clearToken: async () => undefined,
        setSignedInContext: async () => undefined,
        isEnabled: () => !!baseUrl,
    } as unknown as HubConfigService
}

function makeAuth(): HubAuthService {
    return { getAuthHeaders: async () => ({}) } as unknown as HubAuthService
}

describe('HubDataSource', () => {
    let ds: HubDataSource

    beforeEach(() => {
        ds = new HubDataSource(makeConfig(), makeAuth())
    })

    it('loadArchitecture rejects non-hub DocRefs', async () => {
        await expect(
            ds.loadArchitecture({ kind: 'local', uri: '/tmp/a.json' }),
        ).rejects.toThrow(/hub/i)
    })

    it('loadArchitecture returns the parsed architecture for a numeric id', async () => {
        const arch = await ds.loadArchitecture({
            kind: 'hub',
            namespace: 'finos',
            calmType: 'Architectures',
            id: '1',
            version: '1.0.0',
        })
        expect((arch as { nodes?: unknown[] }).nodes).toHaveLength(1)
    })

    it('loadArchitecture routes slug ids through fetchResourceByCustomId', async () => {
        const arch = await ds.loadArchitecture({
            kind: 'hub',
            namespace: 'finos',
            calmType: 'Architectures',
            id: 'trader-x',
            version: 'slug-v1',
        })
        expect(arch).toBeDefined()
    })

    it('loadVersionList chooses patterns vs architectures', async () => {
        const patternVersions = await ds.loadVersionList({
            kind: 'hub', namespace: 'finos', calmType: 'Patterns', id: '1', version: '',
        })
        expect(patternVersions).toEqual(['2.0.0'])
        const archVersions = await ds.loadVersionList({
            kind: 'hub', namespace: 'finos', calmType: 'Architectures', id: '1', version: '',
        })
        expect(archVersions).toEqual(['1.0.0', '1.1.0'])
    })

    it('throws when the base URL is empty', async () => {
        const broken = new HubDataSource(makeConfig(''), makeAuth())
        await expect(broken.listNamespaces()).rejects.toThrow(/configured/i)
    })

    it('lists namespaces, architectures, and ADRs through the tree helpers', async () => {
        expect(await ds.listNamespaces()).toEqual(['finos', 'acme'])
        expect(await ds.listArchitectures('finos')).toHaveLength(1)
        const adrs = await ds.listAdrs('finos')
        expect(adrs[0]).toMatchObject({ title: 'ADR-1', status: 'accepted' })
    })

    it('loadAdr accepts both DocRef and "ns/id/rev" string', async () => {
        const fromDocRef = await ds.loadAdr({
            kind: 'hub', namespace: 'finos', calmType: 'ADRs' as never, id: '1', version: '1',
        } as never)
        expect(fromDocRef).toEqual({ adr: { title: 'ADR-1' } })
        const fromString = await ds.loadAdr('finos/1/1')
        expect(fromString).toEqual({ adr: { title: 'ADR-1' } })
    })
})
