/**
 * @finos/calm-design-tokens — single source of truth for CALM brand colours,
 * typography, and palettes used by the Hub UI, the VSCode extension webview,
 * the React component package (calm-ui-react), and the Handlebars widgets.
 *
 * Two surfaces:
 *   1. tokens.css — CSS custom properties for stylesheet/Tailwind use.
 *   2. This module — typed TS exports for places that compose styles in JS
 *      (ReactFlow inline node styles, SVG marker fills, `${color}20` opacity
 *      composition — all need real hex strings, not var() references).
 */

export const colors = {
    brand: {
        primary: '#000063',
        accent: '#007dff',
        accentLight: '#b2d8f5',
    },

    background: {
        base: '#ffffff',
        secondary: '#f8fafc',
        tertiary: '#f1f5f9',
        card: '#ffffff',
    },

    text: {
        primary: '#1e293b',
        secondary: '#64748b',
        muted: '#94a3b8',
    },

    border: {
        default: '#e2e8f0',
        dark: '#cbd5e1',
    },

    nodeTypes: {
        actor: '#8b5cf6',
        ecosystem: '#0ea5e9',
        system: '#3b82f6',
        service: '#06b6d4',
        database: '#10b981',
        network: '#f59e0b',
        ldap: '#a855f7',
        webclient: '#0891b2',
        'data-asset': '#14b8a6',
        interface: '#d946ef',
        'external-service': '#ec4899',
        default: '#64748b',
    },

    risk: {
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#ca8a04',
        low: '#16a34a',
    },

    status: {
        success: '#16a34a',
        warning: '#ca8a04',
        error: '#dc2626',
        info: '#0284c7',
    },

    adrStatus: {
        draft: '#f97316',
        proposed: '#14b8a6',
        accepted: '#84cc16',
        superseded: '#8b5cf6',
        rejected: '#ef4444',
        deprecated: '#64748b',
    },

    edge: {
        default: '#94a3b8',
        selected: '#007dff',
        interacts: '#8b5cf6',
        backward: '#a855f7',
    },

    group: {
        background: '#f8fafc',
        border: '#cbd5e1',
        label: '#64748b',
    },

    decision: {
        oneOf: '#ca8a04',
        anyOf: '#0284c7',
    },

    feedback: {
        positive: '#16a34a',
        negative: '#dc2626',
    },

    calm: {
        blue: '#1f6dff',
        blueDeep: '#0a4ad6',
        blueSoft: '#e8f0ff',
        teal: '#1aa3b7',
    },
    ink: {
        900: '#0f172a',
        700: '#334155',
        500: '#64748b',
        400: '#94a3b8',
        300: '#cbd5e1',
        200: '#e2e8f0',
        100: '#f1f5f9',
        50: '#f8fafc',
    },
    timelineBg: '#f6f7f9',
    new: '#ef4444',
    diffPalette: {
        add: { bg: '#e8f6ee', border: '#b6dfc6', fg: '#15803d', sign: '+' },
        mod: { bg: '#fdf3e2', border: '#f3dca4', fg: '#b45309', sign: '~' },
        del: { bg: '#fde8e8', border: '#f1bfbf', fg: '#b91c1c', sign: '−' },
    },
} as const

export type Colors = typeof colors

export const fonts = {
    sans: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    monoJb: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    bodyDefault:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
} as const

export type Fonts = typeof fonts

export function getNodeTypeColor(nodeType: string): string {
    const type = nodeType.toLowerCase()
    return (
        colors.nodeTypes[type as keyof typeof colors.nodeTypes] ||
        colors.nodeTypes.default
    )
}

export function getRiskLevelColor(riskLevel: string): string {
    const level = riskLevel.toLowerCase()
    return (
        colors.risk[level as keyof typeof colors.risk] || colors.text.secondary
    )
}

export function getAdrStatusColor(status: string): string {
    const normalizedStatus = status.toLowerCase()
    return (
        colors.adrStatus[normalizedStatus as keyof typeof colors.adrStatus] ||
        colors.border.dark
    )
}

/**
 * Sets CSS custom properties on the document root from colors.brand so the
 * Tailwind/DaisyUI build can reference --color-primary, --color-accent, and
 * --color-accent-light at runtime. Equivalent to the historical
 * initThemeCssVars() function in calm-hub-ui/src/theme/colors.ts — kept here
 * for consumers that prefer JS-driven theming. Consumers that include
 * `tokens.css` as a stylesheet do not need to call this.
 */
export function initThemeCssVars(): void {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.style.setProperty('--color-primary', colors.brand.primary)
    root.style.setProperty('--color-accent', colors.brand.accent)
    root.style.setProperty('--color-accent-light', colors.brand.accentLight)
}
