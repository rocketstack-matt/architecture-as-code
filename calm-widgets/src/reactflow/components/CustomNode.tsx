import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { THEME, getNodeTypeColor, getRiskLevelColor } from '../theme/theme';
import { GRAPH_LAYOUT } from '../adapter/constants';
import type { ReactFlowNodeData } from '../contracts';

/**
 * Returns a simple inline SVG icon based on node type
 */
function NodeTypeIcon({ nodeType, color }: { nodeType: string; color: string }) {
    const style: React.CSSProperties = { width: '16px', height: '16px', flexShrink: 0, color };
    const type = nodeType.toLowerCase();

    // Database icon
    if (type === 'database' || type === 'datastore' || type === 'data-store') {
        return (
            <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
        );
    }
    // User/Actor icon
    if (type === 'actor') {
        return (
            <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
        );
    }
    // Service/Cog icon
    if (type === 'service') {
        return (
            <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        );
    }
    // Network icon
    if (type === 'network') {
        return (
            <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-4h14v4" /><path d="M12 12V8" />
            </svg>
        );
    }
    // Default box icon for system, ecosystem, etc.
    return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
    );
}

export function CustomNode({ data }: NodeProps<ReactFlowNodeData>) {
    const [isHovered, setIsHovered] = useState(false);

    const onNodeClick = data.onNodeClick;
    const onJumpToControl = data.onJumpToControl;

    const description = data.description || 'No description available';
    const nodeType = data.nodeType || 'Unknown';
    const hasDetailedArchitecture = data.hasDetailedArchitecture;

    const riskLevel = data.riskLevel || null;
    const risks = data.risks || [];
    const mitigations = data.mitigations || [];

    const riskCount = risks.length;
    const mitigationCount = mitigations.length;

    const nodeControls = data.controls || {};
    const controlEntries = Object.entries(nodeControls);
    const controlCount = controlEntries.length;

    const color = getNodeTypeColor(nodeType);

    const getBorderColor = () => {
        if (riskLevel) return getRiskLevelColor(riskLevel);
        return color;
    };

    const borderColor = getBorderColor();

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: `${GRAPH_LAYOUT.NODE_WIDTH}px`,
                height: `${GRAPH_LAYOUT.NODE_HEIGHT}px`,
                position: 'relative',
            }}
        >
            <div
                style={{
                    background: THEME.colors.card,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '12px',
                    padding: '16px',
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    color: THEME.colors.foreground,
                    fontSize: '14px',
                    fontWeight: 500,
                    boxShadow: isHovered ? THEME.shadows.lg : THEME.shadows.sm,
                    transition: 'box-shadow 0.3s ease-in-out',
                }}
            >
                {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 */}
                <Handle type="source" position={Position.Bottom} id="source" style={{ opacity: 0 }} />
                {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 */}
                <Handle type="target" position={Position.Top} id="target" style={{ opacity: 0 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <NodeTypeIcon nodeType={nodeType} color={color} />
                        <span>{data.label}</span>
                        {hasDetailedArchitecture && (
                            <div title="Has detailed architecture">
                                <svg style={{ width: '14px', height: '14px', flexShrink: 0, color: THEME.colors.accent }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {(riskCount > 0 || mitigationCount > 0 || controlCount > 0) && (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {riskCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: `${borderColor}20`, color: borderColor }}>
                                    <span>{riskCount}</span>
                                </div>
                            )}
                            {mitigationCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: `${THEME.colors.success}20`, color: THEME.colors.success }}>
                                    <span>{mitigationCount}</span>
                                </div>
                            )}
                            {controlCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: `${THEME.colors.accent}20`, color: THEME.colors.accent }}>
                                    <span>{controlCount}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isHovered && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        minWidth: '300px',
                        background: THEME.colors.card,
                        border: `2px solid ${borderColor}`,
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: THEME.shadows.lg,
                        zIndex: 1000,
                    }}
                >
                    <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: THEME.colors.muted, marginBottom: '4px' }}>Type:</div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: THEME.colors.accent }}>{nodeType}</div>
                    </div>
                    {riskLevel && (
                        <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: THEME.colors.muted, marginBottom: '4px' }}>Risk Level:</div>
                            <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: borderColor }}>{riskLevel}</span>
                        </div>
                    )}
                    {riskCount > 0 && (
                        <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: THEME.colors.muted, marginBottom: '4px' }}>Risks:</div>
                            <div style={{ fontSize: '12px', color: THEME.colors.foreground }}>
                                {risks.map((risk, idx) => (
                                    <div key={idx} style={{ marginBottom: '4px' }}>
                                        {risk.name || risk.id || risk.description || JSON.stringify(risk)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {mitigationCount > 0 && (
                        <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: THEME.colors.muted, marginBottom: '4px' }}>Mitigations:</div>
                            <div style={{ fontSize: '12px', color: THEME.colors.foreground }}>
                                {mitigations.map((mitigation, idx) => (
                                    <div key={idx} style={{ marginBottom: '4px' }}>
                                        {mitigation.name || mitigation.id || mitigation.description || JSON.stringify(mitigation)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {controlCount > 0 && (
                        <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: THEME.colors.muted, marginBottom: '4px' }}>Controls:</div>
                            <div style={{ fontSize: '12px', color: THEME.colors.foreground }}>
                                {controlEntries.map(([controlId, control], idx) => (
                                    <div
                                        key={idx}
                                        style={{ marginBottom: '4px', padding: '6px', borderRadius: '4px', cursor: onJumpToControl ? 'pointer' : 'default' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onJumpToControl) onJumpToControl(`${data.id}/${controlId}`);
                                        }}
                                    >
                                        <div style={{ fontWeight: 500, color: THEME.colors.accent }}>{controlId}</div>
                                        {control.description && (
                                            <div style={{ color: THEME.colors.muted, marginLeft: '8px' }}>{control.description}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: THEME.colors.muted, marginBottom: '4px' }}>Description:</div>
                        <div style={{ fontSize: '12px', color: THEME.colors.foreground, lineHeight: 1.5 }}>{description}</div>
                    </div>
                    {onNodeClick && (
                        <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: '8px', marginTop: '8px' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onNodeClick(data); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 500,
                                    borderRadius: '6px', background: THEME.colors.accent, color: '#ffffff',
                                    border: 'none', cursor: 'pointer',
                                }}
                            >
                                Show Details
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
