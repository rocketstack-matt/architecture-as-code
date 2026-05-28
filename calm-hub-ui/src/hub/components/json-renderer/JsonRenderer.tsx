/**
 * Re-export of JsonRenderer from @finos/calm-ui-react.
 *
 * The component now lives in calm-ui-react/views/JsonView so the VSCode
 * extension webview and Hub UI share a single implementation. This file
 * remains for backwards compatibility with existing local imports. New code
 * should import from `@finos/calm-ui-react/views/JsonView` (or the package
 * root) directly.
 */
export { JsonRenderer } from '@finos/calm-ui-react/views/JsonView';
