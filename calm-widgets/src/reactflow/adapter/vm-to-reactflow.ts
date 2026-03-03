import { Node, Edge, MarkerType } from 'reactflow';
import dagre from '@dagrejs/dagre';
import type { BlockArchVM, VMContainer, VMLeafNode, VMEdge } from '../../widgets/block-architecture/types';
import type { ReactFlowNodeData, ReactFlowEdgeData } from '../contracts';
import { THEME } from '../theme/theme';
import { GRAPH_LAYOUT } from './constants';
import { createTopLevelLayout } from './layout-utils';

export interface ReactFlowData {
    nodes: Node[];
    edges: Edge[];
}

export interface ReactFlowOptions {
    onNodeClick?: (node: VMLeafNode) => void;
    onEdgeClick?: (edge: VMEdge) => void;
}

/**
 * Build ReactFlow nodes and edges from a BlockArchVM (before layout).
 */
function buildReactFlowElements(vm: BlockArchVM): {
    allNodes: Node[];
    allEdges: Edge[];
    nodeToContainer: Map<string, string>;
} {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const nodeToContainer = new Map<string, string>();

    function processContainer(container: VMContainer, parentId?: string): void {
        const groupNode: Node = {
            id: container.id,
            type: 'group',
            position: { x: 0, y: 0 },
            data: {
                label: container.label,
                description: container.description,
            },
            style: {
                width: GRAPH_LAYOUT.SYSTEM_NODE_DEFAULT_WIDTH,
                height: GRAPH_LAYOUT.SYSTEM_NODE_DEFAULT_HEIGHT,
            },
        };

        if (parentId) {
            groupNode.parentId = parentId;
            groupNode.extent = 'parent';
        }

        allNodes.push(groupNode);

        for (const leaf of container.nodes) {
            const nodeData: ReactFlowNodeData = {
                id: leaf.id,
                label: leaf.label,
                nodeType: leaf.nodeType,
                description: leaf.description,
                controls: leaf.controls,
                metadata: leaf.metadata,
                riskLevel: leaf.riskLevel,
                risks: leaf.risks,
                mitigations: leaf.mitigations,
                hasDetailedArchitecture: leaf.hasDetailedArchitecture,
            };

            const customNode: Node = {
                id: leaf.id,
                type: 'custom',
                position: { x: 0, y: 0 },
                data: nodeData,
                parentId: container.id,
                extent: 'parent',
            };

            allNodes.push(customNode);
            nodeToContainer.set(leaf.id, container.id);
        }

        for (const child of container.containers) {
            processContainer(child, container.id);
        }
    }

    for (const container of vm.containers) {
        processContainer(container);
    }

    for (const leaf of vm.looseNodes) {
        const nodeData: ReactFlowNodeData = {
            id: leaf.id,
            label: leaf.label,
            nodeType: leaf.nodeType,
            description: leaf.description,
            controls: leaf.controls,
            metadata: leaf.metadata,
            riskLevel: leaf.riskLevel,
            risks: leaf.risks,
            mitigations: leaf.mitigations,
            hasDetailedArchitecture: leaf.hasDetailedArchitecture,
        };

        allNodes.push({
            id: leaf.id,
            type: 'custom',
            position: { x: 0, y: 0 },
            data: nodeData,
        });
    }

    for (const vmEdge of vm.edges) {
        const isInteracts = vmEdge.relationshipType === 'interacts';

        const edgeData: ReactFlowEdgeData = {
            id: vmEdge.id,
            source: vmEdge.source,
            target: vmEdge.target,
            description: vmEdge.description,
            protocol: vmEdge.protocol,
            direction: vmEdge.direction,
            flowTransitions: vmEdge.flowTransitions,
            controls: vmEdge.controls,
            metadata: vmEdge.metadata,
        };

        const edge: Edge = {
            id: vmEdge.id,
            source: vmEdge.source,
            target: vmEdge.target,
            type: 'smoothstep',
            label: vmEdge.label,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: isInteracts ? THEME.colors.edge.interacts : THEME.colors.edge.default },
            style: {
                stroke: isInteracts ? THEME.colors.edge.interacts : THEME.colors.edge.default,
                strokeWidth: 2,
                ...(isInteracts ? { strokeDasharray: '5 5' } : {}),
            },
            labelStyle: {
                fontSize: 12,
                fontWeight: 500,
                fill: THEME.colors.foreground,
            },
            labelBgStyle: {
                fill: THEME.colors.card,
                fillOpacity: 0.9,
            },
            labelBgPadding: [6, 4] as [number, number],
            labelBgBorderRadius: 4,
            data: edgeData,
        };

        allEdges.push(edge);
    }

    return { allNodes, allEdges, nodeToContainer };
}

/**
 * Converts a BlockArchVM into ReactFlow nodes and edges with layout applied.
 *
 * Uses the `vm.layoutEngine` setting to choose between Dagre (sync, default)
 * and ELK (async, better for complex hierarchical diagrams).
 */
export async function vmToReactFlow(vm: BlockArchVM, options?: ReactFlowOptions): Promise<ReactFlowData> {
    const { allNodes, allEdges, nodeToContainer } = buildReactFlowElements(vm);

    if (vm.layoutEngine === 'elk') {
        const { applyElkLayout } = await import('./elk-layout');
        return applyElkLayout(vm, allNodes, allEdges);
    }

    return applyDagreLayout(allNodes, allEdges, nodeToContainer);
}

/**
 * Get the effective width/height of a node for layout purposes.
 * Groups use their computed style dimensions; leaf nodes use constants.
 */
function getNodeDimensions(node: Node): { width: number; height: number } {
    if (node.type === 'group') {
        return {
            width: (node.style?.width as number) || GRAPH_LAYOUT.SYSTEM_NODE_DEFAULT_WIDTH,
            height: (node.style?.height as number) || GRAPH_LAYOUT.SYSTEM_NODE_DEFAULT_HEIGHT,
        };
    }
    return { width: GRAPH_LAYOUT.NODE_WIDTH, height: GRAPH_LAYOUT.NODE_HEIGHT };
}

/**
 * Build a bottom-up ordering of group IDs so inner groups are processed before outer ones.
 */
function getGroupProcessingOrder(allNodes: Node[]): string[] {
    const groups = allNodes.filter(n => n.type === 'group');
    const groupById = new Map(groups.map(g => [g.id, g]));
    const order: string[] = [];
    const visited = new Set<string>();

    function visit(id: string) {
        if (visited.has(id)) return;
        visited.add(id);
        // Visit child groups first (depth-first)
        for (const g of groups) {
            if (g.parentId === id) {
                visit(g.id);
            }
        }
        order.push(id);
    }

    // Start from root groups (no parent, or parent is not a group)
    for (const g of groups) {
        if (!g.parentId || !groupById.has(g.parentId)) {
            visit(g.id);
        }
    }
    return order;
}

/**
 * Multi-pass Dagre layout: lay out groups bottom-up, then top-level nodes.
 */
function applyDagreLayout(
    allNodes: Node[],
    allEdges: Edge[],
    nodeToContainer: Map<string, string>
): ReactFlowData {
    const nodeById = new Map(allNodes.map(n => [n.id, n]));
    const headerHeight = GRAPH_LAYOUT.GROUP_HEADER_HEIGHT;
    const padding = GRAPH_LAYOUT.SYSTEM_NODE_PADDING;

    // Collect direct children (both leaf and group) per group
    const childrenByGroup = new Map<string, Node[]>();
    for (const node of allNodes) {
        if (node.parentId && nodeById.get(node.parentId)?.type === 'group') {
            if (!childrenByGroup.has(node.parentId)) {
                childrenByGroup.set(node.parentId, []);
            }
            childrenByGroup.get(node.parentId)!.push(node);
        }
    }

    // Process groups bottom-up so inner groups are sized before outer ones
    const groupOrder = getGroupProcessingOrder(allNodes);

    for (const groupId of groupOrder) {
        const children = childrenByGroup.get(groupId);
        if (!children || children.length === 0) continue;

        // Find edges where both endpoints are direct children of this group
        const childIds = new Set(children.map(c => c.id));
        const internalEdges = allEdges.filter(
            e => childIds.has(e.source) && childIds.has(e.target)
        );

        // Run Dagre layout using each child's actual dimensions
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({
            rankdir: GRAPH_LAYOUT.RANK_DIR,
            ranksep: GRAPH_LAYOUT.RANK_SEPARATION,
            nodesep: GRAPH_LAYOUT.NODE_SEPARATION,
            edgesep: GRAPH_LAYOUT.EDGE_SEPARATION,
            marginx: GRAPH_LAYOUT.MARGIN_X,
            marginy: GRAPH_LAYOUT.MARGIN_Y,
        });

        for (const child of children) {
            const dims = getNodeDimensions(child);
            dagreGraph.setNode(child.id, { width: dims.width, height: dims.height });
        }
        for (const edge of internalEdges) {
            dagreGraph.setEdge(edge.source, edge.target);
        }

        dagre.layout(dagreGraph);

        // Apply positions with header offset, using each child's own dimensions
        let maxRight = 0;
        let maxBottom = 0;
        for (const child of children) {
            const pos = dagreGraph.node(child.id);
            const dims = getNodeDimensions(child);
            child.position = {
                x: pos.x - dims.width / 2,
                y: pos.y - dims.height / 2 + headerHeight,
            };
            maxRight = Math.max(maxRight, child.position.x + dims.width);
            maxBottom = Math.max(maxBottom, child.position.y + dims.height);
        }

        // Resize the group node to fit all children
        const groupNode = nodeById.get(groupId)!;
        groupNode.style = {
            ...groupNode.style,
            width: maxRight + padding,
            height: maxBottom + padding,
        };
    }

    // Final pass: Layout top-level nodes (groups + ungrouped leaf nodes)
    const topLevelNodes = allNodes.filter(n => !n.parentId);
    const topLevelNodeIds = new Set(topLevelNodes.map(n => n.id));
    const topLevelEdges = allEdges.filter(e => {
        const srcTop = topLevelNodeIds.has(e.source) || topLevelNodeIds.has(nodeToContainer.get(e.source) ?? '');
        const tgtTop = topLevelNodeIds.has(e.target) || topLevelNodeIds.has(nodeToContainer.get(e.target) ?? '');
        return srcTop || tgtTop;
    }).map(e => ({
        ...e,
        source: nodeToContainer.get(e.source) ?? e.source,
        target: nodeToContainer.get(e.target) ?? e.target,
    }));

    // Deduplicate edges for top-level layout
    const seen = new Set<string>();
    const dedupedEdges = topLevelEdges.filter(e => {
        const key = `${e.source}->${e.target}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return e.source !== e.target;
    });

    const positions = createTopLevelLayout(topLevelNodes, dedupedEdges);
    for (const node of topLevelNodes) {
        const pos = positions.get(node.id);
        if (pos) {
            node.position = pos;
        }
    }

    return { nodes: allNodes, edges: allEdges };
}
