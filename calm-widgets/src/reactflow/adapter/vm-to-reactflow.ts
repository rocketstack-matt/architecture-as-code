import { Node, Edge, MarkerType } from 'reactflow';
import type { BlockArchVM, VMContainer, VMLeafNode, VMEdge } from '../../widgets/block-architecture/types';
import type { ReactFlowNodeData, ReactFlowEdgeData } from '../contracts';
import { THEME } from '../theme/theme';
import { GRAPH_LAYOUT } from './constants';
import { getLayoutedElements, createTopLevelLayout } from './layout-utils';

export interface ReactFlowData {
    nodes: Node[];
    edges: Edge[];
}

export interface ReactFlowOptions {
    onNodeClick?: (node: VMLeafNode) => void;
    onEdgeClick?: (edge: VMEdge) => void;
}

/**
 * Converts a BlockArchVM into ReactFlow nodes and edges with Dagre layout applied.
 */
export function vmToReactFlow(vm: BlockArchVM, options?: ReactFlowOptions): ReactFlowData {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    // Track which node IDs live inside which container (for edge routing)
    const nodeToContainer = new Map<string, string>();

    // Process containers recursively
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

        // Process leaf nodes inside this container
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

        // Recurse into nested containers
        for (const child of container.containers) {
            processContainer(child, container.id);
        }
    }

    // Process top-level containers
    for (const container of vm.containers) {
        processContainer(container);
    }

    // Process loose nodes
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

    // Process edges
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
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: isInteracts ? THEME.colors.edge.interacts : THEME.colors.edge.default },
            style: {
                stroke: isInteracts ? THEME.colors.edge.interacts : THEME.colors.edge.default,
                strokeWidth: 2,
                ...(isInteracts ? { strokeDasharray: '5 5' } : {}),
            },
            data: edgeData,
        };

        allEdges.push(edge);
    }

    // Apply layout
    return applyLayout(allNodes, allEdges, nodeToContainer);
}

/**
 * Two-pass layout: first lay out children within containers, then top-level nodes.
 */
function applyLayout(
    allNodes: Node[],
    allEdges: Edge[],
    nodeToContainer: Map<string, string>
): ReactFlowData {
    // Identify group (container) nodes
    const groupIds = new Set(allNodes.filter(n => n.type === 'group').map(n => n.id));

    // Collect children per group
    const childrenByGroup = new Map<string, Node[]>();
    for (const node of allNodes) {
        if (node.parentId && groupIds.has(node.parentId) && node.type !== 'group') {
            if (!childrenByGroup.has(node.parentId)) {
                childrenByGroup.set(node.parentId, []);
            }
            childrenByGroup.get(node.parentId)!.push(node);
        }
    }

    // Pass 1: Layout children within each group
    for (const [groupId, children] of childrenByGroup) {
        // Find edges internal to this group
        const childIds = new Set(children.map(c => c.id));
        const internalEdges = allEdges.filter(
            e => childIds.has(e.source) && childIds.has(e.target)
        );

        const { nodes: layouted } = getLayoutedElements(children, internalEdges);

        // Apply positions back to the nodes
        for (const ln of layouted) {
            const original = allNodes.find(n => n.id === ln.id);
            if (original) {
                original.position = ln.position;
            }
        }

        // Resize the group node based on children positions
        const groupNode = allNodes.find(n => n.id === groupId);
        if (groupNode && layouted.length > 0) {
            const padding = GRAPH_LAYOUT.SYSTEM_NODE_PADDING;
            let maxX = 0;
            let maxY = 0;
            for (const child of layouted) {
                maxX = Math.max(maxX, child.position.x + GRAPH_LAYOUT.NODE_WIDTH);
                maxY = Math.max(maxY, child.position.y + GRAPH_LAYOUT.NODE_HEIGHT);
            }
            groupNode.style = {
                ...groupNode.style,
                width: maxX + padding,
                height: maxY + padding,
            };
        }
    }

    // Pass 2: Layout top-level nodes (groups + ungrouped leaf nodes)
    const topLevelNodes = allNodes.filter(n => !n.parentId);
    // Edges where at least one endpoint is top-level or a group
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
