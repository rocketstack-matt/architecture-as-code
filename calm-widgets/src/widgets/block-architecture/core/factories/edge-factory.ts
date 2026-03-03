import { CalmRelationshipCanonicalModel, toKindView, CalmRelationshipTypeKindView } from '@finos/calm-models/canonical';
import { VMEdge } from '../../types';
import { VMEdgeFactory, EdgeConfig } from './vm-factory-interfaces';
import { labelFor, ifaceId, pickIface } from '../utils';
import { toVMControls } from './node-factory';

/**
 * Extracts the top-level relationship-type key name (e.g., 'connects', 'interacts')
 */
function extractRelationshipTypeName(relType: CalmRelationshipCanonicalModel['relationship-type']): string | undefined {
    if (!relType || typeof relType !== 'object') return undefined;
    const keys = Object.keys(relType);
    return keys.length > 0 ? keys[0] : undefined;
}

/**
 * Adds enrichment fields to a VM edge from the source relationship
 */
function enrichEdge(edge: VMEdge, rel: CalmRelationshipCanonicalModel, config: EdgeConfig): void {
    if (rel.description) edge.description = rel.description;
    if (rel.protocol) edge.protocol = rel.protocol;
    const relTypeName = extractRelationshipTypeName(rel['relationship-type']);
    if (relTypeName) edge.relationshipType = relTypeName;
    const vmControls = toVMControls(rel.controls as Record<string, unknown> | undefined);
    if (vmControls) edge.controls = vmControls;
    const metadata = rel.metadata as Record<string, unknown> | undefined;
    if (metadata) edge.metadata = metadata;
    const flowTransitions = config.flowTransitionsByRelId?.get(rel['unique-id']);
    if (flowTransitions && flowTransitions.length > 0) edge.flowTransitions = flowTransitions;
}

/**
 * Standard implementation of VMEdgeFactory for creating edges from relationships
 */
export class StandardVMEdgeFactory implements VMEdgeFactory {
    createEdge(relationship: CalmRelationshipCanonicalModel, config: EdgeConfig): VMEdge[] {
        const kind = toKindView(relationship['relationship-type']);
        const edges: VMEdge[] = [];

        if (kind.kind === 'connects') {
            const edge = this.createConnectsEdge(relationship, kind, config);
            if (edge) edges.push(edge);
        }

        if (kind.kind === 'interacts') {
            const interactEdges = this.createInteractsEdges(relationship, kind, config);
            edges.push(...interactEdges);
        }

        return edges;
    }

    private createConnectsEdge(
        rel: CalmRelationshipCanonicalModel,
        kind: Extract<CalmRelationshipTypeKindView, { kind: 'connects' }>,
        config: EdgeConfig
    ): VMEdge | null {
        const srcNode = kind.source.node;
        const dstNode = kind.destination.node;
        const srcIface = pickIface(kind.source);
        const dstIface = pickIface(kind.destination);

        const source = config.renderInterfaces && srcIface ? ifaceId(srcNode, srcIface) : srcNode;
        const target = config.renderInterfaces && dstIface ? ifaceId(dstNode, dstIface) : dstNode;

        let label: string | undefined;
        if (config.edgeLabelMode === 'description') {
            label = this.generateEdgeLabel(rel, srcNode, dstNode, srcIface, dstIface, config);
        }

        const edge: VMEdge = { id: rel['unique-id'], source, target, label };

        if (config.enrichForReactFlow) {
            enrichEdge(edge, rel, config);
        }

        return edge;
    }

    private createInteractsEdges(
        rel: CalmRelationshipCanonicalModel,
        kind: Extract<CalmRelationshipTypeKindView, { kind: 'interacts' }>,
        config: EdgeConfig
    ): VMEdge[] {
        const edges: VMEdge[] = [];
        for (const n of kind.nodes || []) {
            let label: string | undefined;
            if (config.edgeLabelMode === 'description') {
                label = rel.description || 'interacts';
            }
            const edge: VMEdge = {
                id: `${rel['unique-id']}::${n}`,
                source: kind.actor,
                target: n,
                label
            };

            if (config.enrichForReactFlow) {
                enrichEdge(edge, rel, config);
            }

            edges.push(edge);
        }
        return edges;
    }

    private generateEdgeLabel(
        rel: CalmRelationshipCanonicalModel,
        srcNode: string,
        dstNode: string,
        srcIface: string | undefined,
        dstIface: string | undefined,
        config: EdgeConfig
    ): string | undefined {
        // Prefer description; if absent, fall back to combined interface names
        if (rel.description) return rel.description;

        const srcIfaceName = srcIface ? config.ifaceNames.get(srcNode)?.get(srcIface) : undefined;
        const dstIfaceName = dstIface ? config.ifaceNames.get(dstNode)?.get(dstIface) : undefined;

        if (srcIfaceName || dstIfaceName) {
            const srcLabel = srcIfaceName ?? labelFor(config.nodesById.get(srcNode), srcNode);
            const dstLabel = dstIfaceName ?? labelFor(config.nodesById.get(dstNode), dstNode);
            return `${srcLabel} → ${dstLabel}`;
        }

        return undefined;
    }
}
