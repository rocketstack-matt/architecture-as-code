import React from 'react';
import { THEME } from '../../theme/theme';
import type { EdgeBadgeStyle, EdgeBadgeProps } from '../../contracts';

export function EdgeBadge({
    hasFlowInfo,
    hasAIGF,
    badgeStyle,
    onMouseEnter,
    onMouseLeave,
}: EdgeBadgeProps) {
    // Simple SVG icons inline to avoid lucide-react dependency
    const iconStyle: React.CSSProperties = { width: '12px', height: '12px', color: badgeStyle.iconColor };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: `2px solid ${badgeStyle.border}`,
                background: badgeStyle.background,
                cursor: 'help',
                transition: 'all 0.2s',
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {hasFlowInfo ? (
                <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
            ) : hasAIGF ? (
                <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            ) : (
                <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
            )}
        </div>
    );
}

export function getBadgeStyle(hasFlowInfo: boolean, hasAIGF: boolean): EdgeBadgeStyle {
    if (hasFlowInfo) {
        return {
            background: `${THEME.colors.accent}20`,
            border: THEME.colors.accent,
            iconColor: THEME.colors.accent,
        };
    }
    if (hasAIGF) {
        return {
            background: `${THEME.colors.success}20`,
            border: THEME.colors.success,
            iconColor: THEME.colors.success,
        };
    }
    return {
        background: `${THEME.colors.muted}20`,
        border: THEME.colors.muted,
        iconColor: THEME.colors.muted,
    };
}
