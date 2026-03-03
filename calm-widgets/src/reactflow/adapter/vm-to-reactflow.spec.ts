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
    it('returns empty nodes and edges for empty VM', async () => {
        const result = await vmToReactFlow(emptyVM());
        expect(result.nodes).toEqual([]);
        expect(result.edges).toEqual([]);
    });

    it('creates custom nodes for loose nodes', async () => {
        const vm = emptyVM({
            looseNodes: [
                { id: 'n1', label: 'Service 1', nodeType: 'service' },
                { id: 'n2', label: 'DB 1', nodeType: 'database' },
            ],
        });

        const result = await vmToReactFlow(vm);
        expect(result.nodes).toHaveLength(2);
        expect(result.nodes[0].type).toBe('custom');
        expect(result.nodes[0].data.label).toBe('Service 1');
        expect(result.nodes[1].data.nodeType).toBe('database');
    });

    it('creates group and child nodes for containers', async () => {
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

        const result = await vmToReactFlow(vm);

        const groupNode = result.nodes.find(n => n.id === 'c1');
        expect(groupNode).toBeDefined();
        expect(groupNode!.type).toBe('group');

        const childNode = result.nodes.find(n => n.id === 'n1');
        expect(childNode).toBeDefined();
        expect(childNode!.type).toBe('custom');
        expect(childNode!.parentId).toBe('c1');
    });

    it('creates edges from VM edges', async () => {
        const vm = emptyVM({
            looseNodes: [
                { id: 'a', label: 'A' },
                { id: 'b', label: 'B' },
            ],
            edges: [
                { id: 'r1', source: 'a', target: 'b', label: 'connects', description: 'A to B', protocol: 'HTTPS', relationshipType: 'connects' },
            ],
        });

        const result = await vmToReactFlow(vm);
        expect(result.edges).toHaveLength(1);
        expect(result.edges[0].source).toBe('a');
        expect(result.edges[0].target).toBe('b');
        expect(result.edges[0].data.description).toBe('A to B');
        expect(result.edges[0].data.protocol).toBe('HTTPS');
    });

    it('uses dashed styling for interacts edges', async () => {
        const vm = emptyVM({
            looseNodes: [
                { id: 'actor', label: 'User' },
                { id: 'svc', label: 'Service' },
            ],
            edges: [
                { id: 'r1', source: 'actor', target: 'svc', relationshipType: 'interacts' },
            ],
        });

        const result = await vmToReactFlow(vm);
        expect(result.edges[0].style?.strokeDasharray).toBe('5 5');
    });

    it('preserves enrichment data on nodes', async () => {
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

        const result = await vmToReactFlow(vm);
        const node = result.nodes[0];
        expect(node.data.description).toBe('An enriched service');
        expect(node.data.riskLevel).toBe('high');
        expect(node.data.risks).toHaveLength(1);
        expect(node.data.controls).toBeDefined();
        expect(node.data.hasDetailedArchitecture).toBe(true);
    });

    it('preserves enrichment data on edges', async () => {
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

        const result = await vmToReactFlow(vm);
        const edge = result.edges[0];
        expect(edge.data.description).toBe('Edge desc');
        expect(edge.data.protocol).toBe('JDBC');
        expect(edge.data.flowTransitions).toHaveLength(1);
        expect(edge.data.controls).toBeDefined();
    });

    it('handles nested containers', async () => {
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

        const result = await vmToReactFlow(vm);

        const outerGroup = result.nodes.find(n => n.id === 'outer');
        const innerGroup = result.nodes.find(n => n.id === 'inner');
        const leaf = result.nodes.find(n => n.id === 'leaf');

        expect(outerGroup?.type).toBe('group');
        expect(innerGroup?.type).toBe('group');
        expect(innerGroup?.parentId).toBe('outer');
        expect(leaf?.parentId).toBe('inner');
    });

    describe('layout engine dispatch', () => {
        it('uses dagre layout by default (no layoutEngine set)', async () => {
            const vm = emptyVM({
                looseNodes: [
                    { id: 'a', label: 'A' },
                    { id: 'b', label: 'B' },
                ],
                edges: [
                    { id: 'r1', source: 'a', target: 'b' },
                ],
            });

            const result = await vmToReactFlow(vm);
            expect(result.nodes).toHaveLength(2);
            // Dagre assigns positions
            expect(result.nodes[0].position).toBeDefined();
            expect(result.nodes[0].position.x).not.toBe(0);
        });

        it('uses dagre layout when layoutEngine is "dagre"', async () => {
            const vm = emptyVM({
                layoutEngine: 'dagre',
                looseNodes: [
                    { id: 'a', label: 'A' },
                    { id: 'b', label: 'B' },
                ],
                edges: [
                    { id: 'r1', source: 'a', target: 'b' },
                ],
            });

            const result = await vmToReactFlow(vm);
            expect(result.nodes).toHaveLength(2);
            expect(result.nodes[0].position).toBeDefined();
        });

        it('uses elk layout when layoutEngine is "elk"', async () => {
            const vm = emptyVM({
                layoutEngine: 'elk',
                looseNodes: [
                    { id: 'a', label: 'A' },
                    { id: 'b', label: 'B' },
                ],
                edges: [
                    { id: 'r1', source: 'a', target: 'b' },
                ],
            });

            const result = await vmToReactFlow(vm);
            expect(result.nodes).toHaveLength(2);
            // ELK assigns positions
            expect(result.nodes[0].position).toBeDefined();
        });

        it('elk handles nested containers', async () => {
            const vm = emptyVM({
                layoutEngine: 'elk',
                containers: [
                    {
                        id: 'sys',
                        label: 'System',
                        nodeType: 'system',
                        nodes: [
                            { id: 's1', label: 'Service 1', nodeType: 'service' },
                            { id: 's2', label: 'Service 2', nodeType: 'service' },
                        ],
                        containers: [],
                    },
                ],
                edges: [
                    { id: 'r1', source: 's1', target: 's2' },
                ],
            });

            const result = await vmToReactFlow(vm);
            const groupNode = result.nodes.find(n => n.id === 'sys');
            expect(groupNode).toBeDefined();
            expect(groupNode!.type).toBe('group');
            // ELK should compute dimensions for the group
            expect(groupNode!.style?.width).toBeGreaterThan(0);
            expect(groupNode!.style?.height).toBeGreaterThan(0);
        });

        it('elk handles complex cross-hierarchy edges', async () => {
            const vm = emptyVM({
                layoutEngine: 'elk',
                containers: [
                    {
                        id: 'n99', label: 'System', nodeType: 'system',
                        nodes: [],
                        containers: [
                            {
                                id: 'n12', label: 'Sub1', nodeType: 'system',
                                nodes: [
                                    { id: 'n11', label: 'n11', nodeType: 'service' },
                                    { id: 'n17', label: 'n17', nodeType: 'service' },
                                ],
                                containers: [],
                            },
                            {
                                id: 'n27', label: 'Sub2', nodeType: 'system',
                                nodes: [
                                    { id: 'n21', label: 'n21', nodeType: 'service' },
                                    { id: 'n22', label: 'n22', nodeType: 'service' },
                                    { id: 'n28', label: 'n28', nodeType: 'service' },
                                ],
                                containers: [],
                            },
                            {
                                id: 'n10', label: 'Sub3', nodeType: 'system',
                                nodes: [
                                    { id: 'n15', label: 'n15', nodeType: 'service' },
                                    { id: 'n19', label: 'n19', nodeType: 'service' },
                                    { id: 'n7', label: 'n7', nodeType: 'service' },
                                    { id: 'n8', label: 'n8', nodeType: 'service' },
                                ],
                                containers: [],
                            },
                        ],
                    },
                    {
                        id: 'n2', label: 'System2', nodeType: 'system',
                        nodes: [
                            { id: 'n3', label: 'n3', nodeType: 'service' },
                            { id: 'n4', label: 'n4', nodeType: 'service' },
                            { id: 'n6', label: 'n6', nodeType: 'service' },
                        ],
                        containers: [],
                    },
                    {
                        id: 'n24', label: 'System3', nodeType: 'system',
                        nodes: [{ id: 'n5', label: 'n5', nodeType: 'service' }],
                        containers: [],
                    },
                ],
                edges: [
                    { id: 'e1', source: 'n14', target: 'n11' },
                    { id: 'e2', source: 'n4', target: 'n7' },
                    { id: 'e3', source: 'n17', target: 'n28' },
                    { id: 'e4', source: 'n21', target: 'n15' },
                    { id: 'e5', source: 'n6', target: 'n5' },
                    { id: 'e6', source: 'n14', target: 'n3' },
                    { id: 'e7', source: 'n11', target: 'n4' },
                    { id: 'e8', source: 'n22', target: 'n20' },
                    { id: 'e9', source: 'n19', target: 'n18' },
                    { id: 'e10', source: 'n4', target: 'n8' },
                ],
                looseNodes: [
                    { id: 'n14', label: 'n14' },
                    { id: 'n16', label: 'n16' },
                    { id: 'n9', label: 'n9' },
                    { id: 'n20', label: 'n20' },
                    { id: 'n18', label: 'n18' },
                    { id: 'n1', label: 'n1' },
                    { id: 'n23', label: 'n23' },
                    { id: 'n26', label: 'n26' },
                ],
            });

            const result = await vmToReactFlow(vm);
            expect(result.nodes.length).toBeGreaterThan(0);
        });
    });
});
