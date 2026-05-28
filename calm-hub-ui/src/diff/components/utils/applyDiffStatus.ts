/**
 * Re-export of applyDiffStatus from @finos/calm-ui-react.
 *
 * The diff overlay logic now lives in calm-ui-react/diff so the VSCode webview
 * and Hub UI can share a single implementation. This file remains for
 * backwards compatibility with existing local imports
 * (`from '../../../diff/components/utils/applyDiffStatus.js'`). New code
 * should import from `@finos/calm-ui-react/diff` directly.
 */
export { applyDiffStatus } from '@finos/calm-ui-react/diff'
