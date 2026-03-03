import { describe, it, expect } from 'vitest';
import { vmToReactFlow } from './vm-to-reactflow';
import type { BlockArchVM } from '../../widgets/block-architecture/types';

function emptyVM(overrides: Partial<BlockArchVM> = {}): BlockArchVM {
    return {
        containers: [],
        edges: [],
        attachments: [],
        looseNodes: [],
        ...overrides,
    };
}

describe('vmToReactFlow', () => {
    it('returns empty nodes and edges for empty VM', () => {
        const result = vmToReactFlow(emptyVM());
        expect(result.nodes).toEqual([]);
        expect(result.edges).toEqual([]);
    });

    it('creates custom nodes for loose nodes', () => {
        const vm = emptyVM({
            looseNodes: [
                { id: 'n1', label: 'Service 1', nodeType: 'service' },
                { id: 'n2', label: 'DB 1', nodeType: 'database' },
            ],
        });

        const result = vmToReactFlow(vm);
        expect(result.nodes).toHaveLength(2);
        expect(result.nodes[0].type).toBe('custom');
        expect(result.nodes[0].data.label).toBe('Service 1');
        expect(result.nodes[1].data.nodeType).toBe('database');
    });

    it('creates group and child nodes for containers', () => {
        const vm = emptyVM({
            containers: [
                {
                    id: 'c1',
                    label: 'System',
                    nodeType: 'system',
                    nodes: [{ id: 'n1', label: 'Svc', nodeType: 'service' }],
                    containers: [],
                },
            ],
        });

        const result = vmToReactFlow(vm);

        const groupNode = result.nodes.find(n => n.id === 'c1');
        expect(groupNode).toBeDefined();
        expect(groupNode!.type).toBe('group');

        const childNode = result.nodes.find(n => n.id === 'n1');
        expect(childNode).toBeDefined();
        expect(childNode!.type).toBe('custom');
        expect(childNode!.parentId).toBe('c1');
    });

    it('creates edges from VM edges', () => {
        const vm = emptyVM({
            looseNodes: [
                { id: 'a', label: 'A' },
                { id: 'b', label: 'B' },
            ],
            edges: [
                { id: 'r1', source: 'a', target: 'b', label: 'connects', description: 'A to B', protocol: 'HTTPS', relationshipType: 'connects' },
            ],
        });

        const result = vmToReactFlow(vm);
        expect(result.edges).toHaveLength(1);
        expect(result.edges[0].source).toBe('a');
        expect(result.edges[0].target).toBe('b');
        expect(result.edges[0].data.description).toBe('A to B');
        expect(result.edges[0].data.protocol).toBe('HTTPS');
    });

    it('uses dashed styling for interacts edges', () => {
        const vm = emptyVM({
            looseNodes: [
                { id: 'actor', label: 'User' },
                { id: 'svc', label: 'Service' },
            ],
            edges: [
                { id: 'r1', source: 'actor', target: 'svc', relationshipType: 'interacts' },
            ],
        });

        const result = vmToReactFlow(vm);
        expect(result.edges[0].style?.strokeDasharray).toBe('5 5');
    });

    it('preserves enrichment data on nodes', () => {
        const vm = emptyVM({
            looseNodes: [
                {
                    id: 'n1', label: 'Enriched', nodeType: 'service',
                    description: 'An enriched service',
                    riskLevel: 'high',
                    risks: [{ name: 'Risk 1' }],
                    mitigations: [{ name: 'Mitigation 1' }],
                    controls: { 'ctrl-1': { description: 'Auth control' } },
                    hasDetailedArchitecture: true,
                },
            ],
        });

        const result = vmToReactFlow(vm);
        const node = result.nodes[0];
        expect(node.data.description).toBe('An enriched service');
        expect(node.data.riskLevel).toBe('high');
        expect(node.data.risks).toHaveLength(1);
        expect(node.data.controls).toBeDefined();
        expect(node.data.hasDetailedArchitecture).toBe(true);
    });

    it('preserves enrichment data on edges', () => {
        const vm = emptyVM({
            looseNodes: [
                { id: 'a', label: 'A' },
                { id: 'b', label: 'B' },
            ],
            edges: [
                {
                    id: 'r1', source: 'a', target: 'b',
                    description: 'Edge desc',
                    protocol: 'JDBC',
                    relationshipType: 'connects',
                    controls: { 'c1': { description: 'TLS required' } },
                    flowTransitions: [{ flowId: 'f1', flowName: 'Flow 1', sequenceNumber: 1, description: 'Step 1' }],
                },
            ],
        });

        const result = vmToReactFlow(vm);
        const edge = result.edges[0];
        expect(edge.data.description).toBe('Edge desc');
        expect(edge.data.protocol).toBe('JDBC');
        expect(edge.data.flowTransitions).toHaveLength(1);
        expect(edge.data.controls).toBeDefined();
    });

    it('handles nested containers', () => {
        const vm = emptyVM({
            containers: [
                {
                    id: 'outer',
                    label: 'Outer',
                    nodeType: 'system',
                    nodes: [],
                    containers: [
                        {
                            id: 'inner',
                            label: 'Inner',
                            nodeType: 'system',
                            nodes: [{ id: 'leaf', label: 'Leaf', nodeType: 'service' }],
                            containers: [],
                        },
                    ],
                },
            ],
        });

        const result = vmToReactFlow(vm);

        const outerGroup = result.nodes.find(n => n.id === 'outer');
        const innerGroup = result.nodes.find(n => n.id === 'inner');
        const leaf = result.nodes.find(n => n.id === 'leaf');

        expect(outerGroup?.type).toBe('group');
        expect(innerGroup?.type).toBe('group');
        expect(innerGroup?.parentId).toBe('outer');
        expect(leaf?.parentId).toBe('inner');
    });
});
