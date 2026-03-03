import { describe, it, expect } from 'vitest';
import { buildBlockArchVM, BlockArchVMBuilder } from './vm-builder';
import { CalmCoreCanonicalModel } from '@finos/calm-models/canonical';
import { NormalizedOptions } from '../types';

const baseOpts = (over: Partial<NormalizedOptions> = {}): NormalizedOptions => ({
    includeContainers: 'all',
    includeChildren: 'all',
    edges: 'connected',
    direction: 'both',
    renderInterfaces: false,
    renderNodeTypeShapes: false,
    edgeLabels: 'description',
    collapseRelationships: false,
    theme: 'light',
    layoutEngine: 'elk',
    enrichForReactFlow: false,
    ...over,
});

describe('vm-builder', () => {
    it('buildBlockArchVM returns empty vm for empty context', () => {
        const context: CalmCoreCanonicalModel = { nodes: [], relationships: [] };
        const opts = baseOpts();
        const vm = buildBlockArchVM(context, opts);
        expect(vm.containers).toEqual([]);
        expect(vm.edges).toEqual([]);
        expect(vm.looseNodes).toEqual([]);
    });

    it('BlockArchVMBuilder enforces call order', () => {
        const context: CalmCoreCanonicalModel = { nodes: [], relationships: [] };
        const opts = baseOpts();
        const builder = new BlockArchVMBuilder(context, opts);

        expect(() => builder.resolveVisibility()).toThrowError(
            'Must call analyzeRelationships() first'
        );
        builder.analyzeRelationships();

        expect(() => builder.buildContainers()).toThrowError(
            'Must call resolveVisibility() first'
        );
    });

    it('builds simple container with node inside', () => {
        const context: CalmCoreCanonicalModel = {
            nodes: [
                { 'unique-id': 'c1', 'node-type': 'system', name: 'Container1', description: '' },
                { 'unique-id': 'n1', 'node-type': 'service', name: 'Service1', description: '' },
            ],
            relationships: [
                {
                    'unique-id': 'r1',
                    'relationship-type': { 'composed-of': { container: 'c1', nodes: ['n1'] } },
                },
            ],
        };

        const opts = baseOpts();
        const vm = buildBlockArchVM(context, opts);

        expect(vm.containers.length).toBe(1);
        expect(vm.containers[0].id).toBe('c1');
        expect(vm.containers[0].nodes.some((n) => n.id === 'n1')).toBe(true);
        expect(vm.edges.length).toBe(0);
    });

    it('builds connects edge between two nodes', () => {
        const context: CalmCoreCanonicalModel = {
            nodes: [
                { 'unique-id': 'a', 'node-type': 'service', name: 'A', description: '' },
                { 'unique-id': 'b', 'node-type': 'database', name: 'B', description: '' },
            ],
            relationships: [
                {
                    'unique-id': 'r1',
                    'relationship-type': {
                        connects: {
                            source: { node: 'a', interfaces: ['api'] },
                            destination: { node: 'b', interfaces: ['jdbc'] },
                        },
                    },
                    description: 'A to B',
                },
            ],
        };

        const opts = baseOpts({ renderInterfaces: true });
        const vm = buildBlockArchVM(context, opts);

        expect(vm.edges.length).toBe(1);
        expect(vm.edges[0].id).toBe('r1');
        expect(vm.edges[0].label).toBe('A to B');
        // check that iface IDs are used when renderInterfaces = true
        expect(vm.edges[0].source).toContain('a__iface__');
        expect(vm.edges[0].target).toContain('b__iface__');
    });

    it('merges highlight and focus nodes into highlightNodeIds', () => {
        const context: CalmCoreCanonicalModel = {
            nodes: [{ 'unique-id': 'x', 'node-type': 'actor', name: 'X', description: '' }],
            relationships: [],
        };
        const opts = baseOpts({ focusNodes: ['x'], highlightNodes: ['y'] });
        const vm = buildBlockArchVM(context, opts);
        expect(vm.highlightNodeIds).toEqual(expect.arrayContaining(['x', 'y']));
    });

    it('includes warnings from visibility', () => {
        const context: CalmCoreCanonicalModel = {
            nodes: [
                { 'unique-id': 'n1', 'node-type': 'service', name: 'N1', description: '' },
                { 'unique-id': 'c1', 'node-type': 'system', name: 'C1', description: '' },
            ],
            relationships: [
                {
                    'unique-id': 'r1',
                    'relationship-type': { 'composed-of': { container: 'c1', nodes: ['n1', 'n1'] } },
                },
            ],
        };
        const vm = buildBlockArchVM(context, baseOpts());
        expect(Array.isArray(vm.warnings)).toBe(true);
    });

    it('does not populate enrichment fields when enrichForReactFlow is false', () => {
        const context: CalmCoreCanonicalModel = {
            nodes: [
                { 'unique-id': 'n1', 'node-type': 'service', name: 'Svc', description: 'A service', controls: { 'c1': { description: 'Ctrl', requirements: [] } } },
            ],
            relationships: [],
            flows: [{ 'unique-id': 'f1', name: 'Flow1', description: 'A flow', transitions: [] }],
            controls: { 'arch-ctrl': { description: 'Arch control', requirements: [] } },
        };
        const vm = buildBlockArchVM(context, baseOpts({ enrichForReactFlow: false }));
        expect(vm.flows).toBeUndefined();
        expect(vm.controls).toBeUndefined();
        // Loose node should not have enrichment fields
        const node = vm.looseNodes.find(n => n.id === 'n1');
        expect(node).toBeDefined();
        expect(node!.description).toBeUndefined();
        expect(node!.controls).toBeUndefined();
    });

    it('populates enrichment fields when enrichForReactFlow is true', () => {
        const context: CalmCoreCanonicalModel = {
            nodes: [
                {
                    'unique-id': 'n1', 'node-type': 'service', name: 'Svc', description: 'A service',
                    controls: { 'c1': { description: 'Ctrl', requirements: [] } },
                    metadata: { aigf: { 'risk-level': 'medium', risks: [{ name: 'R1' }], mitigations: [{ name: 'M1' }] } },
                },
                { 'unique-id': 'n2', 'node-type': 'database', name: 'DB', description: 'A database' },
            ],
            relationships: [
                {
                    'unique-id': 'r1',
                    'relationship-type': { connects: { source: { node: 'n1' }, destination: { node: 'n2' } } },
                    description: 'Svc to DB',
                    protocol: 'JDBC',
                    controls: { 'rc1': { description: 'Edge ctrl', requirements: [] } },
                },
            ],
            flows: [{
                'unique-id': 'f1', name: 'Flow1', description: 'Main flow',
                transitions: [
                    { 'relationship-unique-id': 'r1', 'sequence-number': 1, description: 'Step 1' },
                ],
            }],
            controls: { 'arch-ctrl': { description: 'Arch control', requirements: [] } },
        };
        const vm = buildBlockArchVM(context, baseOpts({ enrichForReactFlow: true }));

        // Architecture-level enrichment
        expect(vm.flows).toBeDefined();
        expect(vm.flows).toHaveLength(1);
        expect(vm.flows![0].name).toBe('Flow1');
        expect(vm.flows![0].transitions).toHaveLength(1);
        expect(vm.controls).toEqual({ 'arch-ctrl': { description: 'Arch control', requirements: [] } });

        // Node enrichment
        const node = vm.looseNodes.find(n => n.id === 'n1');
        expect(node).toBeDefined();
        expect(node!.description).toBe('A service');
        expect(node!.controls).toEqual({ 'c1': { description: 'Ctrl', requirements: [] } });
        expect(node!.riskLevel).toBe('medium');
        expect(node!.risks).toEqual([{ name: 'R1' }]);
        expect(node!.mitigations).toEqual([{ name: 'M1' }]);

        // Edge enrichment
        const edge = vm.edges.find(e => e.id === 'r1');
        expect(edge).toBeDefined();
        expect(edge!.description).toBe('Svc to DB');
        expect(edge!.protocol).toBe('JDBC');
        expect(edge!.relationshipType).toBe('connects');
        expect(edge!.controls).toEqual({ 'rc1': { description: 'Edge ctrl', requirements: [] } });
        expect(edge!.flowTransitions).toHaveLength(1);
        expect(edge!.flowTransitions![0].flowName).toBe('Flow1');
    });
});
