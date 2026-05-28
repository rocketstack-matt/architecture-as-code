/**
 * Re-export of @finos/calm-design-tokens — the single source of truth for
 * colours used across Hub UI, the VSCode extension webview, and the React
 * component library. This file exists for backwards compatibility with the
 * many local imports (`from '../../theme/colors.js'`). New code should import
 * directly from @finos/calm-design-tokens.
 */

export {
    colors,
    initThemeCssVars,
} from '@finos/calm-design-tokens'
export type { Colors } from '@finos/calm-design-tokens'
