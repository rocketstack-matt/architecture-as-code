import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow,
    NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FloatingEdge } from './FloatingEdge';
import { CustomNode } from './CustomNode';
import { SystemGroupNode } from './SystemGroupNode';
import { THEME } from '../theme/theme';
import { GRAPH_LAYOUT } from '../adapter/constants';
import { vmToReactFlow } from '../adapter/vm-to-reactflow';
import type { BlockArchVM, VMLeafNode, VMEdge } from '../../widgets/block-architecture/types';

export interface CalmReactFlowGraphProps {
    vm: BlockArchVM;
    onNodeClick?: (node: VMLeafNode) => void;
    onEdgeClick?: (edge: VMEdge) => void;
    onBackgroundClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Get the effective width/height of a node for bounds calculation.
 * Group nodes use their style dimensions; leaf nodes use constants.
 */
function getChildDimensions(node: Node): { width: number; height: number } {
    if (node.type === 'group') {
        return {
            width: (node.style?.width as number) || GRAPH_LAYOUT.SYSTEM_NODE_DEFAULT_WIDTH,
            height: (node.style?.height as number) || GRAPH_LAYOUT.SYSTEM_NODE_DEFAULT_HEIGHT,
        };
    }
    return { width: GRAPH_LAYOUT.NODE_WIDTH, height: GRAPH_LAYOUT.NODE_HEIGHT };
}

/**
 * Calculate the minimum bounds for a group node based on its children
 */
function calculateGroupBounds(
    groupId: string,
    allNodes: Node[]
): { width: number; height: number } | null {
    const children = allNodes.filter((n) => n.parentId === groupId);
    if (children.length === 0) return null;

    const padding = GRAPH_LAYOUT.SYSTEM_NODE_PADDING;

    let maxX = -Infinity;
    let maxY = -Infinity;

    children.forEach((child) => {
        const dims = getChildDimensions(child);
        const childRight = child.position.x + dims.width;
        const childBottom = child.position.y + dims.height;
        maxX = Math.max(maxX, childRight);
        maxY = Math.max(maxY, childBottom);
    });

    return {
        width: maxX + padding,
        height: maxY + padding,
    };
}

export function CalmReactFlowGraph(props: CalmReactFlowGraphProps) {
    return (
        // @ts-expect-error ReactFlow v11 types incompatible with @types/react@19
        <ReactFlowProvider>
            <CalmReactFlowGraphInner {...props} />
        </ReactFlowProvider>
    );
}

function CalmReactFlowGraphInner({
    vm,
    onNodeClick,
    onEdgeClick,
    onBackgroundClick,
    className,
    style: containerStyle,
}: CalmReactFlowGraphProps) {
    const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();

    const edgeTypes = useMemo(() => ({ custom: FloatingEdge }), []);
    const nodeTypes = useMemo(() => ({ custom: CustomNode, group: SystemGroupNode }), []);

    useEffect(() => {
        let cancelled = false;
        vmToReactFlow(vm).then(({ nodes, edges }) => {
            if (!cancelled) {
                setNodes(nodes);
                setEdges(edges);
                // ReactFlow needs time to measure and render new nodes before fitView.
                // setTimeout ensures the DOM update from setNodes/setEdges has been
                // committed and ReactFlow has processed the node dimensions.
                setTimeout(() => {
                    if (!cancelled) fitView({ padding: 0.2, duration: 200 });
                }, 50);
            }
        }).catch((err) => {
            console.error('[CalmReactFlowGraph] layout error:', err);
        });
        return () => { cancelled = true; };
    }, [vm, setNodes, setEdges, fitView]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChangeBase(changes);

            const hasPositionChanges = changes.some(
                (change) => change.type === 'position' && change.dragging === false
            );

            if (hasPositionChanges) {
                setNodes((currentNodes) => {
                    let updated = false;
                    const newNodes = currentNodes.map((node) => {
                        if (node.type !== 'group') return node;
                        const bounds = calculateGroupBounds(node.id, currentNodes);
                        if (!bounds) return node;

                        const currentWidth = (node.style?.width as number) || node.width || 0;
                        const currentHeight = (node.style?.height as number) || node.height || 0;

                        if (bounds.width !== currentWidth || bounds.height !== currentHeight) {
                            updated = true;
                            return {
                                ...node,
                                width: bounds.width,
                                height: bounds.height,
                                style: { ...node.style, width: bounds.width, height: bounds.height },
                            };
                        }
                        return node;
                    });
                    return updated ? newNodes : currentNodes;
                });
            }
        },
        [onNodesChangeBase, setNodes]
    );

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (onNodeClick) onNodeClick(node.data);
        },
        [onNodeClick]
    );

    const handleNodeMouseEnter = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setNodes((nds) =>
                nds.map((n) => ({
                    ...n,
                    style: {
                        ...n.style,
                        zIndex: n.id === node.id && n.type !== 'group' ? 1000 : n.type === 'group' ? -1 : 1,
                    },
                }))
            );
        },
        [setNodes]
    );

    const handleNodeMouseLeave = useCallback(() => {
        setNodes((nds) =>
            nds.map((n) => ({
                ...n,
                style: { ...n.style, zIndex: n.type === 'group' ? -1 : 1 },
            }))
        );
    }, [setNodes]);

    const handleEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: Edge) => {
            if (onEdgeClick) onEdgeClick(edge.data);
        },
        [onEdgeClick]
    );

    const handlePaneClick = useCallback(() => {
        if (onBackgroundClick) onBackgroundClick();
    }, [onBackgroundClick]);

    const isEmpty = nodes.length === 0;

    if (isEmpty) {
        return (
            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: THEME.colors.background,
                    color: THEME.colors.muted,
                    fontSize: '14px',
                    ...containerStyle,
                }}
                className={className}
            >
                <div
                    style={{
                        padding: '24px',
                        background: THEME.colors.backgroundSecondary,
                        borderRadius: '8px',
                        border: `1px solid ${THEME.colors.border}`,
                        maxWidth: '400px',
                        textAlign: 'center',
                    }}
                >
                    No architecture data to display.
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', width: '100%', ...containerStyle }} className={className}>
            {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 — upgrade to @xyflow/react to resolve */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onNodeMouseEnter={handleNodeMouseEnter}
                onNodeMouseLeave={handleNodeMouseLeave}
                onEdgeClick={handleEdgeClick}
                onPaneClick={handlePaneClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                attributionPosition="bottom-left"
                style={{ background: THEME.colors.background }}
            >
                {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 */}
                <Background color={THEME.colors.border} gap={16} />
                {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 */}
                <Controls
                    style={{
                        background: THEME.colors.card,
                        border: `1px solid ${THEME.colors.border}`,
                        borderRadius: '8px',
                    }}
                />
                {/* @ts-expect-error ReactFlow v11 types incompatible with @types/react@19 */}
                <MiniMap
                    style={{
                        background: THEME.colors.backgroundSecondary,
                        border: `1px solid ${THEME.colors.border}`,
                    }}
                    nodeColor={THEME.colors.accent}
                    maskColor={`${THEME.colors.background}cc`}
                />
            </ReactFlow>
        </div>
    );
}
