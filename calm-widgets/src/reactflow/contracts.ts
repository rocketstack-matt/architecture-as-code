/**
 * ReactFlow-specific type contracts for calm-widgets
 */

import type { VMControl, VMRiskItem, VMMitigationItem, VMFlowTransition } from '../widgets/block-architecture/types';

/** Style for edge badges */
export interface EdgeBadgeStyle {
    background: string;
    border: string;
    iconColor: string;
}

/** Props for EdgeBadge component */
export interface EdgeBadgeProps {
    hasFlowInfo: boolean;
    hasAIGF: boolean;
    badgeStyle: EdgeBadgeStyle;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

/** Props for EdgeTooltip component */
export interface EdgeTooltipProps {
    description: string;
    protocol?: string;
    direction?: string;
    flowTransitions: VMFlowTransition[];
    edgeControls: Record<string, VMControl>;
    controlsApplied: string[];
    mitigations: (string | VMMitigationItem)[];
    risks: (string | VMRiskItem)[];
    labelX: number;
    labelY: number;
}

/** Edge data passed through ReactFlow edge.data */
export interface ReactFlowEdgeData {
    id: string;
    label?: string;
    source: string;
    target: string;
    description?: string;
    protocol?: string;
    direction?: 'forward' | 'backward';
    flowTransitions?: VMFlowTransition[];
    controls?: Record<string, VMControl>;
    metadata?: Record<string, unknown>;
}

/** Node data passed through ReactFlow node.data */
export interface ReactFlowNodeData {
    id: string;
    label: string;
    nodeType?: string;
    description?: string;
    controls?: Record<string, VMControl>;
    metadata?: Record<string, unknown>;
    riskLevel?: string;
    risks?: VMRiskItem[];
    mitigations?: VMMitigationItem[];
    hasDetailedArchitecture?: boolean;
    onNodeClick?: (data: ReactFlowNodeData) => void;
    onJumpToControl?: (controlKey: string) => void;
}
