import type { CalmArchitectureSchema } from '@finos/calm-models/types'

/**
 * A DocRef identifies a CALM document the visualizer should render. Two
 * concrete shapes today:
 *  - `hub`   — a Hub-hosted resource addressed by (namespace, type, id, version).
 *  - `local` — a workspace file addressed by URI (used by the VSCode extension).
 *
 * Adapters resolve the DocRef to bytes; the React tree only ever sees the
 * resolved schema.
 */
export type DocRef =
    | {
          kind: 'hub'
          namespace: string
          calmType: 'Architectures' | 'Patterns'
          id: string
          version: string
      }
    | { kind: 'local'; uri: string }

/** Coarse capability flags so consumers can hide UI that the host can't satisfy. */
export interface CalmDataSourceCapabilities {
    /** True when free-roam file drop is supported (Hub UI's Drawer dropzone). */
    dropzone: boolean
    /** True when the source can return decorator metadata. */
    httpDecorators: boolean
    /** True when the source exposes multiple versions for a single resource. */
    multiVersion: boolean
}

/** Minimal ADR shape consumed by the shared AdrView. The full schema lives in calm-models. */
export interface AdrEnvelope {
    adr: unknown
}

/** Decorator records returned by the Hub for an architecture or pattern. */
export interface DecoratorRecord {
    [key: string]: unknown
}

/** Imported separately to avoid pulling the timeline graph into adapter consumers. */
export type CalmTimelineLike = unknown

/**
 * Abstract data source consumed by the shared React tree.
 *
 * Hub UI supplies an HTTP-backed implementation that delegates to its
 * existing CalmService / AdrService. The VSCode extension supplies a
 * postMessage-backed implementation that proxies requests to the extension
 * host (which then chooses between filesystem reads and Hub REST calls based
 * on DocRef.kind).
 *
 * Methods are optional where Hub-only features (decorators, version lists,
 * timeline) don't make sense for a local file.
 */
export interface CalmDataSource {
    loadArchitecture(ref: DocRef): Promise<CalmArchitectureSchema>
    loadPattern?(ref: DocRef): Promise<Record<string, unknown>>
    loadAdr?(ref: DocRef | string): Promise<AdrEnvelope>
    loadDecorators?(
        namespace: string,
        target: string,
        kind: 'deployment'
    ): Promise<DecoratorRecord[]>
    loadTimeline?(ref: DocRef): Promise<CalmTimelineLike | undefined>
    loadVersionList?(ref: DocRef): Promise<string[]>
    readonly capabilities: CalmDataSourceCapabilities
}

/**
 * Navigation surface for components that need to push state outwards —
 * tree-view selection, editor reveal, and following detailed-architecture
 * references to a sibling document.
 */
export interface CalmNavigator {
    /** Highlight the element with this id outside the diagram (tree, editor). */
    reveal(id: string): void
    /** Open a different DocRef (follow a detailed-architecture link, switch moments). */
    navigate(ref: DocRef): void
}
