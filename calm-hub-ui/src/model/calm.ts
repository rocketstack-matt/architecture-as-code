/**
 * Re-export of the CALM domain types from @finos/calm-hub-client.
 *
 * The canonical definitions now live in the shared hub client package so the
 * VSCode extension and Hub UI agree on the API shapes. This file remains for
 * backwards compatibility with existing local imports (e.g.
 * `from '../model/calm.js'`). New code should import from
 * `@finos/calm-hub-client` directly.
 */
export type {
    Namespace,
    PatternID,
    Pattern,
    Architecture,
    ArchitectureID,
    FlowID,
    AdrID,
    Flow,
    Version,
    Revision,
    Adr,
    CalmType,
    ResourceSummary,
    AdrSummary,
    ResourceMapping,
    Data,
} from '@finos/calm-hub-client';
export { isSlug } from '@finos/calm-hub-client';
