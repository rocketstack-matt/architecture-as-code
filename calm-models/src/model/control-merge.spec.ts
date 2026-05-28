import { describe, it, expect } from 'vitest';
import { extractMergedControls } from './control-merge.js';
import type { CalmArchitectureSchema } from '../types/core-types.js';

const control = (description: string) => ({
    description,
    requirements: [],
});

describe('extractMergedControls', () => {
    it('returns an empty map when the architecture is missing', () => {
        expect(extractMergedControls(undefined)).toEqual({});
        expect(extractMergedControls(null)).toEqual({});
    });

    it('extracts node-level controls with appliesTo metadata', () => {
        const architecture: CalmArchitectureSchema = {
            nodes: [
                {
                    'unique-id': 'svc-1',
                    name: 'Trading Service',
                    'node-type': 'service',
                    controls: { 'data-classification': control('Data classification') },
                } as unknown as CalmArchitectureSchema['nodes'][number],
            ],
            relationships: [],
        } as CalmArchitectureSchema;

        const merged = extractMergedControls(architecture);
        expect(merged['svc-1/data-classification']).toMatchObject({
            description: 'Data classification',
            appliesTo: 'svc-1',
            appliesToType: 'node',
            nodeName: 'Trading Service',
        });
    });

    it('extracts relationship-level controls with appliesTo metadata', () => {
        const architecture: CalmArchitectureSchema = {
            nodes: [],
            relationships: [
                {
                    'unique-id': 'rel-1',
                    description: 'svc → db',
                    'relationship-type': { connects: { source: { node: 'a' }, destination: { node: 'b' } } },
                    controls: { encrypt: control('Encrypt in transit') },
                } as unknown as CalmArchitectureSchema['relationships'][number],
            ],
        } as CalmArchitectureSchema;

        const merged = extractMergedControls(architecture);
        expect(merged['rel-1/encrypt']).toMatchObject({
            description: 'Encrypt in transit',
            appliesTo: 'rel-1',
            appliesToType: 'relationship',
            relationshipDescription: 'svc → db',
        });
    });

    it('places root-level controls under the bare key with appliesToType: architecture', () => {
        const architecture: CalmArchitectureSchema = {
            nodes: [],
            relationships: [],
            controls: { 'risk-rating': control('Overall risk') },
        } as unknown as CalmArchitectureSchema;

        const merged = extractMergedControls(architecture);
        expect(merged['risk-rating']).toMatchObject({
            description: 'Overall risk',
            appliesTo: 'architecture',
            appliesToType: 'architecture',
        });
    });

    it('lets root-level controls win over node/relationship entries with the same key', () => {
        const architecture: CalmArchitectureSchema = {
            nodes: [
                {
                    'unique-id': 'svc-1',
                    name: 'svc',
                    'node-type': 'service',
                    controls: { shared: control('node-control') },
                } as unknown as CalmArchitectureSchema['nodes'][number],
            ],
            relationships: [],
            controls: { shared: control('root-control') },
        } as unknown as CalmArchitectureSchema;

        const merged = extractMergedControls(architecture);
        expect(merged.shared.description).toBe('root-control');
        expect(merged.shared.appliesToType).toBe('architecture');
        // Node-level entry retains its namespaced key alongside the root one.
        expect(merged['svc-1/shared'].appliesToType).toBe('node');
    });

    it('skips nodes and relationships that have no controls field', () => {
        const architecture: CalmArchitectureSchema = {
            nodes: [
                { 'unique-id': 'svc-1', name: 'svc', 'node-type': 'service' } as unknown as CalmArchitectureSchema['nodes'][number],
            ],
            relationships: [
                { 'unique-id': 'rel-1', 'relationship-type': {} } as unknown as CalmArchitectureSchema['relationships'][number],
            ],
        } as CalmArchitectureSchema;

        expect(extractMergedControls(architecture)).toEqual({});
    });
});
