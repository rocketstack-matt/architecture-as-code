import { CalmNodeCanonicalModel } from '@finos/calm-models/canonical';
import { VMLeafNode, VMAttach, VMControl, VMRiskItem, VMMitigationItem } from '../../types';
import { VMNodeFactory } from './vm-factory-interfaces';
import { ifaceId, prettyLabel } from '../utils';


type WithOptionalLabel = CalmNodeCanonicalModel & { label?: string };

export const labelFor = (n?: WithOptionalLabel, id?: string) =>
    n?.name || n?.label || n?.['unique-id'] || (id ? prettyLabel(id) : '');

/**
 * Converts canonical controls to VM controls
 */
export function toVMControls(controls?: Record<string, unknown>): Record<string, VMControl> | undefined {
    if (!controls || typeof controls !== 'object') return undefined;
    const result: Record<string, VMControl> = {};
    let hasEntries = false;
    for (const [key, val] of Object.entries(controls)) {
        if (val && typeof val === 'object' && 'description' in val) {
            const ctrl = val as { description: string; requirements?: Array<{ 'requirement-url': string } & Record<string, unknown>> };
            result[key] = { description: ctrl.description, requirements: ctrl.requirements };
            hasEntries = true;
        }
    }
    return hasEntries ? result : undefined;
}

/**
 * Extracts risk level from metadata (AIGF convention)
 */
function extractRiskLevel(metadata?: Record<string, unknown>): string | undefined {
    if (!metadata) return undefined;
    const aigf = metadata['aigf'] as Record<string, unknown> | undefined;
    if (aigf && typeof aigf['risk-level'] === 'string') return aigf['risk-level'];
    return undefined;
}

/**
 * Extracts risk items from metadata (AIGF convention)
 */
function extractRisks(metadata?: Record<string, unknown>): VMRiskItem[] | undefined {
    if (!metadata) return undefined;
    const aigf = metadata['aigf'] as Record<string, unknown> | undefined;
    if (!aigf || !Array.isArray(aigf['risks'])) return undefined;
    return (aigf['risks'] as unknown[]).map(r => {
        if (typeof r === 'string') return { description: r };
        const obj = r as Record<string, unknown>;
        return {
            id: typeof obj['id'] === 'string' ? obj['id'] : undefined,
            name: typeof obj['name'] === 'string' ? obj['name'] : undefined,
            description: typeof obj['description'] === 'string' ? obj['description'] : undefined,
        };
    });
}

/**
 * Extracts mitigation items from metadata (AIGF convention)
 */
function extractMitigations(metadata?: Record<string, unknown>): VMMitigationItem[] | undefined {
    if (!metadata) return undefined;
    const aigf = metadata['aigf'] as Record<string, unknown> | undefined;
    if (!aigf || !Array.isArray(aigf['mitigations'])) return undefined;
    return (aigf['mitigations'] as unknown[]).map(m => {
        if (typeof m === 'string') return { description: m };
        const obj = m as Record<string, unknown>;
        return {
            id: typeof obj['id'] === 'string' ? obj['id'] : undefined,
            name: typeof obj['name'] === 'string' ? obj['name'] : undefined,
            description: typeof obj['description'] === 'string' ? obj['description'] : undefined,
        };
    });
}


/**
 * Standard implementation of VMNodeFactory for creating leaf nodes with interface attachments
 */
export class StandardVMNodeFactory implements VMNodeFactory {
    createLeafNode(node: CalmNodeCanonicalModel, renderInterfaces: boolean, enrichForReactFlow?: boolean): { node: VMLeafNode; attachments: VMAttach[] } {
        const attachments: VMAttach[] = [];
        const leaf: VMLeafNode = {
            id: node['unique-id'],
            label: labelFor(node, node['unique-id']),
            nodeType: node['node-type']
        };

        if (renderInterfaces && Array.isArray(node.interfaces) && node.interfaces.length > 0) {
            leaf.interfaces = node.interfaces.map(itf => {
                const iid = ifaceId(node['unique-id'], itf['unique-id']);
                attachments.push({ from: node['unique-id'], to: iid });
                return { id: iid, label: `◻ ${itf.name || itf['unique-id']}` };
            });
        }

        if (enrichForReactFlow) {
            if (node.description) leaf.description = node.description;
            const vmControls = toVMControls(node.controls as Record<string, unknown> | undefined);
            if (vmControls) leaf.controls = vmControls;
            const metadata = node.metadata as Record<string, unknown> | undefined;
            if (metadata) leaf.metadata = metadata;
            const riskLevel = extractRiskLevel(metadata);
            if (riskLevel) leaf.riskLevel = riskLevel;
            const risks = extractRisks(metadata);
            if (risks) leaf.risks = risks;
            const mitigations = extractMitigations(metadata);
            if (mitigations) leaf.mitigations = mitigations;
            if (node.details) leaf.hasDetailedArchitecture = true;
        }

        return { node: leaf, attachments };
    }
}
