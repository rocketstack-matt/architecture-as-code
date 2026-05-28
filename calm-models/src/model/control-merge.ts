import type { CalmArchitectureSchema } from '../types/core-types.js';
import type { CalmControlSchema } from '../types/control-types.js';

/**
 * A control merged from the architecture root, a node, or a relationship,
 * with the metadata callers need to render where the control applies.
 *
 * Lifted from calm-hub-ui's Drawer.tsx (lines 98-144) so the same merge
 * logic is reused by the VSCode tree-view, the Hub UI ControlsPanel, and
 * the shared visualizer.
 */
export interface MergedControl extends CalmControlSchema {
    /** Unique-id of the element the control applies to. */
    appliesTo: string
    /** Where the control was declared. */
    appliesToType: 'node' | 'relationship' | 'architecture'
    /** Friendly name of the node (set when appliesToType === 'node'). */
    nodeName?: string
    /** Description of the relationship (set when appliesToType === 'relationship'). */
    relationshipDescription?: string
}

function extractId(item: { 'unique-id'?: string }): string {
    return item?.['unique-id'] ?? '';
}

/**
 * Walk an architecture schema and merge controls from three sources into a
 * single keyed map suitable for rendering. Root-level controls take
 * precedence over node-level and relationship-level entries with the same
 * key, matching the original Hub UI behaviour.
 *
 * Keys are namespaced where the control was attached:
 *  - root:           {controlId}
 *  - node:           {nodeId}/{controlId}
 *  - relationship:   {relId}/{controlId}
 */
export function extractMergedControls(
    architecture: CalmArchitectureSchema | undefined | null
): Record<string, MergedControl> {
    if (!architecture) return {};

    const rootControlsRaw = architecture.controls ?? {};
    const nodeControls: Record<string, MergedControl> = {};
    const relationshipControls: Record<string, MergedControl> = {};

    const nodes = architecture.nodes ?? [];
    for (const node of nodes) {
        const nodeControlsRaw = node.controls;
        if (!nodeControlsRaw) continue;
        const nodeId = extractId(node);
        for (const [controlId, control] of Object.entries(nodeControlsRaw)) {
            const uniqueControlId = `${nodeId}/${controlId}`;
            nodeControls[uniqueControlId] = {
                ...(control as CalmControlSchema),
                appliesTo: nodeId,
                nodeName: node.name || nodeId,
                appliesToType: 'node',
            };
        }
    }

    const relationships = architecture.relationships ?? [];
    for (const relationship of relationships) {
        const relControlsRaw = relationship.controls;
        if (!relControlsRaw) continue;
        const relId = extractId(relationship);
        for (const [controlId, control] of Object.entries(relControlsRaw)) {
            const uniqueControlId = `${relId}/${controlId}`;
            relationshipControls[uniqueControlId] = {
                ...(control as CalmControlSchema),
                appliesTo: relId,
                relationshipDescription: relationship.description || relId,
                appliesToType: 'relationship',
            };
        }
    }

    const rootControls: Record<string, MergedControl> = {};
    for (const [controlId, control] of Object.entries(rootControlsRaw)) {
        rootControls[controlId] = {
            ...(control as CalmControlSchema),
            appliesTo: 'architecture',
            appliesToType: 'architecture',
        };
    }

    // Root-level wins on key collision (preserves the original Drawer.tsx spread order).
    return { ...nodeControls, ...relationshipControls, ...rootControls };
}
