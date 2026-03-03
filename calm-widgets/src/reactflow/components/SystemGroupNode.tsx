import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { THEME } from '../theme/theme';

export function SystemGroupNode({ data }: NodeProps) {
    return (
        <div
            style={{
                background: THEME.colors.group.background,
                border: `2px dashed ${THEME.colors.group.border}`,
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                transition: 'all 0.3s ease-in-out',
            }}
        >
            {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 */}
            <Handle type="source" position={Position.Bottom} id="source" style={{ opacity: 0, pointerEvents: 'all' }} />
            {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 */}
            <Handle type="target" position={Position.Top} id="target" style={{ opacity: 0, pointerEvents: 'all' }} />
            <div
                style={{
                    position: 'absolute',
                    top: '12px',
                    left: '16px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '12px',
                    background: THEME.colors.backgroundSecondary,
                    color: THEME.colors.group.label,
                    border: `1px solid ${THEME.colors.border}`,
                    pointerEvents: 'auto',
                }}
            >
                {data.label}
            </div>
        </div>
    );
}
