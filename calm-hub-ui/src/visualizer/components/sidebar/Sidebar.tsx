/**
 * Re-export of Sidebar from @finos/calm-ui-react.
 *
 * The component now lives in calm-ui-react/details so the VSCode extension
 * webview and Hub UI share a single implementation. This file remains for
 * backwards compatibility with existing local imports. New code should
 * import from `@finos/calm-ui-react/details` directly.
 */
export { Sidebar } from '@finos/calm-ui-react/details';
