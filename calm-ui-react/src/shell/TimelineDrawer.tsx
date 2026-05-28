import { useState, type ReactNode } from 'react';

interface TimelineDrawerProps {
    /** Start expanded (Hub UI) or collapsed (VSCode Output/Problems style). */
    defaultCollapsed?: boolean;
    /** Pixel height of the drawer when expanded. */
    expandedHeight?: number;
    /** Label shown on the collapsed strip. */
    label?: string;
    children: ReactNode;
}

/**
 * Output/Problems-style collapsible drawer at the bottom of a panel. Used by
 * the VSCode webview to host the TimelineBar without permanently consuming
 * vertical real estate — collapsed to a slim strip by default, expanded with
 * a chevron toggle.
 *
 * Hub UI renders TimelineBar directly (always-on at the bottom of
 * DiagramSection); the drawer wrapper is VSCode-first but lives in
 * @finos/calm-ui-react so future Hub use cases (modal preview, embedded
 * iframes) can reuse it.
 */
export function TimelineDrawer({
    defaultCollapsed = true,
    expandedHeight = 250,
    label = 'Timeline',
    children,
}: TimelineDrawerProps) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    return (
        <div
            data-testid="timeline-drawer"
            style={{
                borderTop: '1px solid var(--calm-border-default, #e2e8f0)',
                background: 'var(--calm-timeline-bg, #f6f7f9)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                transition: 'height 0.15s ease-out',
                height: collapsed ? 28 : expandedHeight,
                overflow: 'hidden',
            }}
        >
            <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? `Expand ${label.toLowerCase()}` : `Collapse ${label.toLowerCase()}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--calm-text-secondary, #64748b)',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    cursor: 'pointer',
                    height: 28,
                    flexShrink: 0,
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        display: 'inline-block',
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderTop: '5px solid currentColor',
                        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease-out',
                    }}
                />
                {label}
            </button>
            {!collapsed && (
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {children}
                </div>
            )}
        </div>
    );
}
