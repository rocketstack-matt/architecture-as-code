import { CalmWidget } from '../../types';

// Types based on CALM model structure
export interface CalmModelNode {
    'unique-id': string;
    'node-type': string;
    name: string;
    description?: string;
    [key: string]: unknown;
}

export interface CalmModelRelationship {
    'unique-id': string;
    'relationship-type': {
        'connects'?: {
            source: { node: string; interfaces?: unknown[] };
            destination: { node: string; interfaces?: unknown[] };
        };
        'interacts'?: {
            actor: string;
            nodes: string[];
        };
        'composed-of'?: {
            container: string;
            nodes: string[];
        };
        'deployed-in'?: {
            container: string;
            nodes: string[];
        };
    };
    description?: string;
    protocol?: string;
    [key: string]: unknown;
}

export interface CalmModelFlow {
    'unique-id': string;
    source: string;
    target: string;
    description?: string;
    [key: string]: unknown;
}

export interface CalmModelContext {
    nodes?: CalmModelNode[];
    relationships?: CalmModelRelationship[];
    flows?: CalmModelFlow[];
}

export interface DiagramOptions {
    nodes?: string[];
}

export interface GraphNode {
    id: string;
    label: string;
    type?: string;
    description?: string;
    parent?: string;
    raw?: unknown;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    type?: string;
    description?: string;
    raw?: unknown;
}

export interface DiagramViewModel {
    nodes: GraphNode[];
    edges: GraphEdge[];
    filteredNodeIds?: Set<string>;
}

function buildParentMapping(relationships: CalmModelRelationship[]): Map<string, string> {
    const parentMap = new Map<string, string>();
    
    for (const rel of relationships) {
        const relType = rel['relationship-type'];
        
        if (relType['deployed-in']) {
            const deployedIn = relType['deployed-in'];
            for (const nodeId of deployedIn.nodes) {
                parentMap.set(nodeId, deployedIn.container);
            }
        } else if (relType['composed-of']) {
            const composedOf = relType['composed-of'];
            for (const nodeId of composedOf.nodes) {
                parentMap.set(nodeId, composedOf.container);
            }
        }
    }
    
    return parentMap;
}

function filterRelatedNodes(targetNodeIds: string[], allNodes: GraphNode[], allEdges: GraphEdge[]): Set<string> {
    const requiredNodes = new Set<string>(targetNodeIds);

    // Add directly connected nodes (one hop only)
    for (const edge of allEdges) {
        if (targetNodeIds.includes(edge.source) && !requiredNodes.has(edge.target)) {
            requiredNodes.add(edge.target);
        }
        if (targetNodeIds.includes(edge.target) && !requiredNodes.has(edge.source)) {
            requiredNodes.add(edge.source);
        }
    }

    // Add parent/container nodes for any included nodes
    for (const node of allNodes) {
        if (requiredNodes.has(node.id) && node.parent && !requiredNodes.has(node.parent)) {
            requiredNodes.add(node.parent);
        }
    }

    return requiredNodes;
}

function toGraph(model: CalmModelContext, nodeFilter?: string[]): DiagramViewModel {
    const nodes = model.nodes || [];
    const relationships = model.relationships || [];
    const flows = model.flows || [];
    
    // Build parent mapping from containment relationships
    const parentMap = buildParentMapping(relationships);
    
    // Start with declared nodes
    const graphNodes: GraphNode[] = nodes
        .filter(n => !!n['unique-id'])
        .map(n => ({
            id: n['unique-id'],
            label: n.name || n['unique-id'],
            type: n['node-type'],
            description: n.description,
            parent: parentMap.get(n['unique-id']),
            raw: n
        }));
    
    // Ensure container nodes referenced by containment relationships exist
    const knownIds = new Set(graphNodes.map(n => n.id));
    for (const containerId of parentMap.values()) {
        if (!knownIds.has(containerId)) {
            graphNodes.push({
                id: containerId,
                label: containerId,
                type: undefined,
                description: undefined,
                parent: parentMap.get(containerId),
                raw: { synthesized: true }
            });
            knownIds.add(containerId);
        }
    }
    
    // Process relationships into edges (excluding containment relationships)
    const relEdges: GraphEdge[] = [];
    for (const rel of relationships) {
        const relType = rel['relationship-type'];
        
        if (relType.connects) {
            const connects = relType.connects;
            relEdges.push({
                id: rel['unique-id'] || `${connects.source.node}->${connects.destination.node}`,
                source: connects.source.node,
                target: connects.destination.node,
                label: rel.description || rel.protocol,
                type: 'connects',
                description: rel.description,
                raw: rel
            });
        } else if (relType.interacts) {
            const interacts = relType.interacts;
            for (const nodeId of interacts.nodes) {
                relEdges.push({
                    id: rel['unique-id'] || `${interacts.actor}->${nodeId}`,
                    source: interacts.actor,
                    target: nodeId,
                    label: rel.description,
                    type: 'interacts',
                    description: rel.description,
                    raw: rel
                });
            }
        }
    }
    
    // Process flows into edges
    const flowEdges: GraphEdge[] = flows
        .filter(f => !!f.source && !!f.target)
        .map(f => ({
            id: f['unique-id'] || `${f.source}->${f.target}`,
            source: f.source,
            target: f.target,
            label: f.description,
            type: 'flow',
            description: f.description,
            raw: f
        }));
    
    const allEdges = [...relEdges, ...flowEdges];
    
    // Apply node filtering if specified
    let filteredNodeIds: Set<string> | undefined;
    let filteredNodes = graphNodes;
    let filteredEdges = allEdges;
    
    if (nodeFilter && nodeFilter.length > 0) {
        filteredNodeIds = filterRelatedNodes(nodeFilter, graphNodes, allEdges);
        filteredNodes = graphNodes.filter(node => filteredNodeIds!.has(node.id));
        filteredEdges = allEdges.filter(edge => 
            filteredNodeIds!.has(edge.source) && filteredNodeIds!.has(edge.target)
        );
    }
    
    return {
        nodes: filteredNodes,
        edges: filteredEdges,
        filteredNodeIds
    };
}

export const DiagramWidget: CalmWidget<
    CalmModelContext,
    DiagramOptions,
    DiagramViewModel
> = {
    id: 'diagram',
    templatePartial: 'diagram-template.html',
    
    transformToViewModel: (context, options) => {
        const nodeFilter = options?.hash?.nodes;
        return toGraph(context, nodeFilter);
    },
    
    validateContext: (context): context is CalmModelContext => {
        if (typeof context !== 'object' || context === null) return false;
        
        const ctx = context as Record<string, unknown>;
        
        // Check nodes array if present
        if (ctx.nodes !== undefined) {
            if (!Array.isArray(ctx.nodes)) return false;
            for (const node of ctx.nodes) {
                if (typeof node !== 'object' || node === null || !node['unique-id'] || !node.name) {
                    return false;
                }
            }
        }
        
        // Check relationships array if present
        if (ctx.relationships !== undefined) {
            if (!Array.isArray(ctx.relationships)) return false;
            for (const rel of ctx.relationships) {
                if (typeof rel !== 'object' || rel === null || !rel['unique-id'] || !rel['relationship-type']) {
                    return false;
                }
            }
        }
        
        // Check flows array if present
        if (ctx.flows !== undefined) {
            if (!Array.isArray(ctx.flows)) return false;
            for (const flow of ctx.flows) {
                if (typeof flow !== 'object' || flow === null || !flow['unique-id'] || !flow.source || !flow.target) {
                    return false;
                }
            }
        }
        
        return true;
    },
    
    registerHelpers: () => ({
        getNodeX: (nodeId: unknown, nodes: unknown) => {
            const index = (nodes as GraphNode[]).findIndex(n => n.id === String(nodeId));
            if (index === -1) return 100;
            
            const node = (nodes as GraphNode[])[index];
            if (node.parent) {
                // Contained nodes have different positioning
                return 100 + (index % 4) * 80 + 35; // Center of contained node
            }
            
            // Top-level nodes
            if (node.type === 'actor') return 60 + index * 120;
            if (node.type === 'system') return 80 + index * 150;
            if (node.type === 'service') return 80 + index * 140;
            if (node.type === 'database') return 80 + index * 130;
            return 95 + index * 120;
        },
        
        getNodeY: (nodeId: unknown, nodes: unknown) => {
            const index = (nodes as GraphNode[]).findIndex(n => n.id === String(nodeId));
            if (index === -1) return 100;
            
            const node = (nodes as GraphNode[])[index];
            if (node.parent) {
                // Contained nodes
                return 160 + Math.floor(index / 4) * 25 + 15; // Center of contained node
            }
            
            // Top-level nodes
            if (node.type === 'actor') return 80;
            if (node.type === 'system') return 80;
            if (node.type === 'service') return 225;
            if (node.type === 'database') return 320;
            return 170;
        },
        
        midPointX: (x1: unknown, x2: unknown) => (Number(x1) + Number(x2)) / 2,
        midPointY: (y1: unknown, y2: unknown) => (Number(y1) + Number(y2)) / 2,
        
        arrayFromSet: (set: unknown) => Array.from(set as Set<string>),
        
        add: (a: unknown, b: unknown) => Number(a) + Number(b),
        multiply: (a: unknown, b: unknown) => Number(a) * Number(b),
        subtract: (a: unknown, b: unknown) => Number(a) - Number(b)
    })
};