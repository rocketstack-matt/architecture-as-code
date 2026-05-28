/**
 * Re-export of the diff UI types from @finos/calm-ui-react/diff.
 *
 * The canonical definitions live in calm-ui-react so the VSCode webview and
 * Hub UI share the same type shape. This file remains for backwards
 * compatibility with existing local imports. New code should import from
 * `@finos/calm-ui-react/diff` directly.
 */
export type {
    DiffStatus,
    DiffNodeData,
    DiffEdgeData,
    DiffSource,
    DiffSourceType,
    DiffGraphProps,
} from '@finos/calm-ui-react/diff'
