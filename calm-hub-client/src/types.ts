import type { CalmAdrMeta } from '@finos/calm-shared/src/view-model/adr.js'
import type {
    CalmArchitectureSchema,
    CalmFlowSchema,
    CalmPatternSchema,
} from '@finos/calm-models/types'

export type Namespace = string
export type PatternID = string
export type Pattern = CalmPatternSchema
export type Architecture = CalmArchitectureSchema
export type ArchitectureID = string
export type FlowID = string
export type AdrID = string
export type Flow = CalmFlowSchema
export type Version = string
export type Revision = string
export type Adr = CalmAdrMeta
export type CalmType =
    | 'Architectures'
    | 'Patterns'
    | 'Flows'
    | 'ADRs'
    | 'Standards'

/** Summary returned from the API for namespace-scoped resources. */
export interface ResourceSummary {
    id: number
    name: string
    description: string
    customId?: string
}

/** Summary returned from the API for ADR resources (title + status). */
export interface AdrSummary {
    id: number
    title: string
    status: string
}

/** Mapping from a human-readable slug to a numeric resource ID. */
export interface ResourceMapping {
    namespace: string
    customId: string
    resourceType: string
    numericId: number
}

/** True when the identifier is a human-readable slug, not a legacy numeric ID. */
export function isSlug(id: string): boolean {
    return !/^\d+$/.test(id)
}

/** Discriminated union for a Hub resource document of any type. */
export type Data =
    | { id: string; version: string; name: Namespace; data: Architecture | undefined; calmType: 'Architectures' }
    | { id: string; version: string; name: Namespace; data: Pattern | undefined; calmType: 'Patterns' }
    | { id: string; version: string; name: Namespace; data: Flow | undefined; calmType: 'Flows' }
    | { id: string; version: string; name: Namespace; data: Adr | undefined; calmType: 'ADRs' }
    | { id: string; version: string; name: Namespace; data: unknown; calmType: 'Standards' }

export interface ControlDetail {
    id: number
    name: string
    description: string
}

export interface InterfaceDetail {
    id: number
    name: string
    description: string
}

export interface SearchResult {
    namespace: string
    id: number
    name: string
    description: string
}

export interface GroupedSearchResults {
    architectures: SearchResult[]
    patterns: SearchResult[]
    flows: SearchResult[]
    standards: SearchResult[]
    interfaces: SearchResult[]
    controls: SearchResult[]
    adrs: SearchResult[]
}

/**
 * Auth contract. Each consumer (Hub UI, VSCode) supplies its own provider —
 * Hub UI plugs in its OIDC token, the VSCode extension reads a token from
 * SecretStorage.
 */
export interface AuthHeadersProvider {
    /**
     * Returns the headers to merge into every outgoing request. Called once
     * per request — implementations should cache + refresh as appropriate.
     * Return an empty object when no auth is configured.
     */
    getAuthHeaders(): Promise<Record<string, string>>
}

/**
 * Decorator payload returned by the Hub for a given resource target. The
 * exact shape varies by decorator kind; consumers narrow as needed.
 */
export interface DecoratorRecord {
    [key: string]: unknown
}
