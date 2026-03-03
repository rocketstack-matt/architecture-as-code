import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from 'reactflow';
import type { BlockArchVM, VMContainer } from '../../widgets/block-architecture/types';
import type { ReactFlowData } from './vm-to-reactflow';
import { GRAPH_LAYOUT } from './constants';

const elk = new ELK();

/**
 * Build a nested ELK graph that mirrors the BlockArchVM container hierarchy.
 *
 * Configuration is aligned with Mermaid's @mermaid-js/layout-elk so that both
 * renderers produce comparable layouts from the same input.
 *
 * Key option: `elk.hierarchyHandling: INCLUDE_CHILDREN` at the root tells ELK
 * to lay out the entire hierarchy in a single pass (the main advantage of ELK
 * over Dagre for compound graphs).  Each container then sets
 * `SEPARATE_CHILDREN` so its internal layout is computed as a self-contained
 * unit — matching Mermaid's approach.
 */
function buildElkGraph(
    vm: BlockArchVM,
    rfNodes: Node[],
    rfEdges: Edge[]
): ElkNode {
    /** Recursively convert a VMContainer into an ElkNode with nested children. */
    function containerToElk(container: VMContainer): ElkNode {
        const children: ElkNode[] = [];

        // Leaf nodes inside this container
        for (const leaf of container.nodes) {
            children.push({
                id: leaf.id,
                width: GRAPH_LAYOUT.NODE_WIDTH,
                height: GRAPH_LAYOUT.NODE_HEIGHT,
            });
        }

        // Nested containers (recurse)
        for (const child of container.containers) {
            children.push(containerToElk(child));
        }

        return {
            id: container.id,
            children,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'spacing.baseValue': '30',
                'elk.layered.spacing.nodeNodeBetweenLayers': String(GRAPH_LAYOUT.RANK_SEPARATION),
                'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
                'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
                'elk.layered.mergeEdges': 'true',
                // Reserve space for the group header label
                'elk.padding': `[top=${GRAPH_LAYOUT.GROUP_HEADER_HEIGHT + 20},left=20,bottom=20,right=20]`,
            },
        };
    }

    // Top-level children: containers + loose nodes
    const topChildren: ElkNode[] = [];

    for (const container of vm.containers) {
        topChildren.push(containerToElk(container));
    }

    for (const leaf of vm.looseNodes) {
        topChildren.push({
            id: leaf.id,
            width: GRAPH_LAYOUT.NODE_WIDTH,
            height: GRAPH_LAYOUT.NODE_HEIGHT,
        });
    }

    // Edges at the root level — ELK routes them across the hierarchy automatically
    // when hierarchyHandling is set to INCLUDE_CHILDREN.
    const edges: ElkExtendedEdge[] = rfEdges.map(e => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
    }));

    return {
        id: 'root',
        children: topChildren,
        edges,
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'spacing.baseValue': '35',
            'elk.layered.spacing.nodeNodeBetweenLayers': String(GRAPH_LAYOUT.TOP_LEVEL_RANK_SEPARATION),
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'elk.layered.mergeEdges': 'true',
            'elk.layered.unnecessaryBendpoints': 'true',
        },
    };
}

/**
 * Recursively map ELK-computed positions back onto ReactFlow nodes.
 *
 * ELK positions are parent-relative, which matches ReactFlow's model for
 * nodes with `parentId` set.
 */
function applyElkPositions(
    elkNode: ElkNode,
    nodeById: Map<string, Node>
): void {
    for (const child of elkNode.children ?? []) {
        const rfNode = nodeById.get(child.id);
        if (rfNode) {
            rfNode.position = { x: child.x ?? 0, y: child.y ?? 0 };

            // For group nodes, update the style dimensions to the ELK-computed size
            if (rfNode.type === 'group' && child.width && child.height) {
                rfNode.style = {
                    ...rfNode.style,
                    width: child.width,
                    height: child.height,
                };
            }
        }

        // Recurse into nested groups
        if (child.children && child.children.length > 0) {
            applyElkPositions(child, nodeById);
        }
    }
}

/**
 * Apply ELK layout to ReactFlow nodes and edges.
 *
 * This is the public entry point used by `vmToReactFlow` when the layout
 * engine is set to `'elk'`.
 */
export async function applyElkLayout(
    vm: BlockArchVM,
    allNodes: Node[],
    allEdges: Edge[]
): Promise<ReactFlowData> {
    const elkGraph = buildElkGraph(vm, allNodes, allEdges);
    const laid = await elk.layout(elkGraph);

    const nodeById = new Map(allNodes.map(n => [n.id, n]));
    applyElkPositions(laid, nodeById);

    return { nodes: allNodes, edges: allEdges };
}
