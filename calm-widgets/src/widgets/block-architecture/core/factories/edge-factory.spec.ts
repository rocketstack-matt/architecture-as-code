import { describe, it, expect } from 'vitest';
import { StandardVMEdgeFactory } from './edge-factory';
import {
    CalmRelationshipCanonicalModel,
    CalmNodeCanonicalModel
} from '@finos/calm-models/canonical';
import { EdgeConfig } from './vm-factory-interfaces';

/** Local helper: makes a default config with optional overrides */
function makeConfig(overrides: Partial<EdgeConfig> = {}): EdgeConfig {
    return {
        renderInterfaces: false,
        edgeLabelMode: 'description',
        collapseRelationships: false,
        ifaceNames: new Map(),
        nodesById: new Map(),
        ...overrides,
    };
}

describe('StandardVMEdgeFactory', () => {
    it('creates interacts edges for each target node with description label', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r1',
            'relationship-type': { interacts: { actor: 'actorA', nodes: ['n1', 'n2'] } },
            description: 'actor to nodes'
        };

        const edges = f.createEdge(rel, makeConfig());

        expect(edges).toHaveLength(2);
        expect(edges[0]).toMatchObject({ id: 'r1::n1', source: 'actorA', target: 'n1', label: 'actor to nodes' });
        expect(edges[1]).toMatchObject({ id: 'r1::n2', source: 'actorA', target: 'n2', label: 'actor to nodes' });
    });

    it('interacts edges have undefined label when edgeLabelMode="none"', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'ri',
            'relationship-type': { interacts: { actor: 'u', nodes: ['v'] } }
        };

        const edges = f.createEdge(rel, makeConfig({ edgeLabelMode: 'none' }));
        expect(edges).toHaveLength(1);
        expect(edges[0].label).toBeUndefined();
    });

    it('creates a single connects edge and prefers description when present', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r2',
            'relationship-type': {
                connects: { source: { node: 's1' }, destination: { node: 'd1' } }
            },
            description: 'connects-desc'
        };

        const edges = f.createEdge(rel, makeConfig());
        expect(edges).toHaveLength(1);
        expect(edges[0]).toMatchObject({ id: 'r2', source: 's1', target: 'd1', label: 'connects-desc' });
    });

    it('connects edge label falls back to iface names when no description', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r3',
            'relationship-type': {
                connects: {
                    source: { node: 'svcA', interfaces: ['api'] },
                    destination: { node: 'dbB', interfaces: ['jdbc'] }
                }
            }
        };

        const ifaceNames = new Map<string, Map<string, string>>([
            ['svcA', new Map([['api', 'API']])],
            ['dbB', new Map([['jdbc', 'JDBC']])]
        ]);

        const edges = f.createEdge(rel, makeConfig({ ifaceNames }));
        expect(edges).toHaveLength(1);
        expect(edges[0].label).toBe('API → JDBC');
        expect(edges[0].source).toBe('svcA');
        expect(edges[0].target).toBe('dbB');
    });

    it('connects edge label falls back to labelFor(node) when one iface name missing', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r4',
            'relationship-type': {
                connects: {
                    source: { node: 'svcA', interfaces: ['api'] },
                    destination: { node: 'dbB', interfaces: ['jdbc'] }
                }
            }
        };

        const ifaceNames = new Map<string, Map<string, string>>([
            ['svcA', new Map([['api', 'API']])]
        ]);

        const nodesById = new Map<string, CalmNodeCanonicalModel>([
            ['svcA', { 'unique-id': 'svcA', 'node-type': 'service', name: 'Service A', description: '' }],
            ['dbB', { 'unique-id': 'dbB', 'node-type': 'database', name: 'Orders DB', description: '' }]
        ]);

        const edges = f.createEdge(rel, makeConfig({ ifaceNames, nodesById }));
        expect(edges[0].label).toBe('API → Orders DB');
    });

    it('when renderInterfaces=true, endpoints use ifaceId(node, iface)', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r5',
            'relationship-type': {
                connects: {
                    source: { node: 'svcA', interfaces: ['api'] },
                    destination: { node: 'dbB', interfaces: ['jdbc'] }
                }
            }
        };

        const edges = f.createEdge(rel, makeConfig({ renderInterfaces: true }));
        expect(edges[0].source).toBe('svcA__iface__api');
        expect(edges[0].target).toBe('dbB__iface__jdbc');
    });

    it('connects edge label is undefined when neither description nor iface names exist', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r6',
            'relationship-type': {
                connects: { source: { node: 'svcA' }, destination: { node: 'dbB' } }
            }
        };

        const edges = f.createEdge(rel, makeConfig());
        expect(edges).toHaveLength(1);
        expect(edges[0].label).toBeUndefined();
    });

    it('unsupported kinds (e.g., deployed-in) produce no edges', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r7',
            'relationship-type': { 'deployed-in': { container: 'containerX', nodes: ['a', 'b'] } }
        };

        const edges = f.createEdge(rel, makeConfig());
        expect(edges).toHaveLength(0);
    });

    it('interacts: endpoints are the same regardless of renderInterfaces', () => {
        const f = new StandardVMEdgeFactory();

        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'ri2',
            'relationship-type': { interacts: { actor: 'actor', nodes: ['x', 'y'] } }
        };

        const a = f.createEdge(rel, makeConfig({ renderInterfaces: false })).map(e => ({ s: e.source, t: e.target }));
        const b = f.createEdge(rel, makeConfig({ renderInterfaces: true })).map(e => ({ s: e.source, t: e.target }));

        expect(a).toEqual(b);
    });

    it('does not add enrichment fields when enrichForReactFlow is false', () => {
        const f = new StandardVMEdgeFactory();
        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r-enrich-off',
            'relationship-type': {
                connects: { source: { node: 'a' }, destination: { node: 'b' } }
            },
            description: 'test description',
            protocol: 'HTTPS',
            controls: { 'c1': { description: 'Ctrl', requirements: [] } },
            metadata: { some: 'data' },
        };
        const edges = f.createEdge(rel, makeConfig({ enrichForReactFlow: false }));
        expect(edges).toHaveLength(1);
        expect(edges[0].description).toBeUndefined();
        expect(edges[0].protocol).toBeUndefined();
        expect(edges[0].relationshipType).toBeUndefined();
        expect(edges[0].controls).toBeUndefined();
        expect(edges[0].metadata).toBeUndefined();
    });

    it('populates enrichment fields on connects edge when enrichForReactFlow is true', () => {
        const f = new StandardVMEdgeFactory();
        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r-enrich-on',
            'relationship-type': {
                connects: { source: { node: 'a' }, destination: { node: 'b' } }
            },
            description: 'Enriched edge',
            protocol: 'HTTPS',
            controls: { 'c1': { description: 'AuthCtrl', requirements: [] } },
            metadata: { custom: 'field' },
        };
        const flowTransitionsByRelId = new Map([
            ['r-enrich-on', [{ flowId: 'f1', flowName: 'Flow 1', sequenceNumber: 1, description: 'Step 1' }]]
        ]);
        const edges = f.createEdge(rel, makeConfig({ enrichForReactFlow: true, flowTransitionsByRelId }));
        expect(edges).toHaveLength(1);
        expect(edges[0].description).toBe('Enriched edge');
        expect(edges[0].protocol).toBe('HTTPS');
        expect(edges[0].relationshipType).toBe('connects');
        expect(edges[0].controls).toEqual({ 'c1': { description: 'AuthCtrl', requirements: [] } });
        expect(edges[0].metadata).toEqual({ custom: 'field' });
        expect(edges[0].flowTransitions).toEqual([{ flowId: 'f1', flowName: 'Flow 1', sequenceNumber: 1, description: 'Step 1' }]);
    });

    it('populates enrichment fields on interacts edges when enrichForReactFlow is true', () => {
        const f = new StandardVMEdgeFactory();
        const rel: CalmRelationshipCanonicalModel = {
            'unique-id': 'r-interacts-enrich',
            'relationship-type': { interacts: { actor: 'user', nodes: ['svc1'] } },
            description: 'user interacts',
        };
        const edges = f.createEdge(rel, makeConfig({ enrichForReactFlow: true }));
        expect(edges).toHaveLength(1);
        expect(edges[0].description).toBe('user interacts');
        expect(edges[0].relationshipType).toBe('interacts');
    });
});
