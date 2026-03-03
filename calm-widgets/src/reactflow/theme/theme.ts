/**
 * Self-contained theme for ReactFlow components in calm-widgets.
 * Decoupled from calm-hub-ui — all color values are defined inline.
 */

export const THEME = {
    colors: {
        primary: '#000063',
        accent: '#007dff',
        accentLight: '#b2d8f5',

        background: '#ffffff',
        backgroundSecondary: '#f8fafc',
        card: '#ffffff',

        foreground: '#1e293b',
        muted: '#94a3b8',
        mutedForeground: '#94a3b8',

        border: '#e2e8f0',
        borderDark: '#cbd5e1',

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
        } as Record<string, string>,

        risk: {
            critical: '#dc2626',
            high: '#ea580c',
            medium: '#ca8a04',
            low: '#16a34a',
        } as Record<string, string>,

        success: '#16a34a',
        warning: '#ca8a04',
        error: '#dc2626',
        info: '#0284c7',

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
    },

    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
} as const;

export type Theme = typeof THEME;

export function getNodeTypeColor(nodeType: string): string {
    const type = nodeType.toLowerCase();
    return THEME.colors.nodeTypes[type] || THEME.colors.nodeTypes.default;
}

export function getRiskLevelColor(riskLevel: string): string {
    const level = riskLevel.toLowerCase();
    return THEME.colors.risk[level] || THEME.colors.muted;
}
