import React, { useState, useCallback } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, useStore } from 'reactflow';
import { getEdgeParams, calculateOffsetPositions } from '../adapter/floating-edges';
import { EdgeBadge, EdgeTooltip, getBadgeStyle } from './edge-components/index';
import type { ReactFlowEdgeData } from '../contracts';

export function FloatingEdge({
    id,
    source,
    target,
    style = {},
    markerEnd,
    markerStart,
    data,
}: EdgeProps<ReactFlowEdgeData>) {
    const [isHovered, setIsHovered] = useState(false);

    const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
    const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

    const direction = data?.direction;
    const offset = direction ? 20 : 0;

    const { adjustedSourceX, adjustedSourceY, adjustedTargetX, adjustedTargetY } = calculateOffsetPositions(
        sx, sy, tx, ty, offset, direction
    );

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX: adjustedSourceX,
        sourceY: adjustedSourceY,
        sourcePosition: sourcePos,
        targetX: adjustedTargetX,
        targetY: adjustedTargetY,
        targetPosition: targetPos,
    });

    const description = data?.description || '';
    const protocol = data?.protocol || '';
    const flowTransitions = data?.flowTransitions || [];
    const edgeControls = data?.controls || {};

    // Extract AIGF data from metadata
    const aigf = data?.metadata?.aigf as Record<string, unknown> | undefined;
    const controlsApplied = (aigf?.['controls-applied'] as string[]) || [];
    const mitigations = (aigf?.mitigations as (string | { id?: string; name?: string })[]) || [];
    const risks = (aigf?.risks as (string | { id?: string; name?: string })[]) || [];

    const hasFlowInfo = flowTransitions.length > 0;
    const hasAIGF = controlsApplied.length > 0 || mitigations.length > 0 || risks.length > 0;
    const badgeStyle = getBadgeStyle(hasFlowInfo, hasAIGF);

    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
                markerStart={markerStart}
            />
            {description && (
                // @ts-expect-error ReactFlow v11 types incompatible with @types/react@19
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                            zIndex: 1000,
                        }}
                        className="nodrag nopan"
                    >
                        <EdgeBadge
                            hasFlowInfo={hasFlowInfo}
                            hasAIGF={hasAIGF}
                            badgeStyle={badgeStyle}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        />
                    </div>

                    {isHovered && (
                        <EdgeTooltip
                            description={description}
                            protocol={protocol}
                            direction={direction}
                            flowTransitions={flowTransitions}
                            edgeControls={edgeControls}
                            controlsApplied={controlsApplied}
                            mitigations={mitigations}
                            risks={risks}
                            labelX={labelX}
                            labelY={labelY}
                        />
                    )}
                </EdgeLabelRenderer>
            )}
        </>
    );
}
