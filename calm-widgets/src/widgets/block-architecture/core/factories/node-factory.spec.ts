import { describe, it, expect } from 'vitest';
import { StandardVMNodeFactory } from './node-factory';
import { CalmNodeCanonicalModel } from '@finos/calm-models/canonical';

describe('StandardVMNodeFactory', () => {
    it('creates leaf node without interfaces when renderInterfaces=false', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n1',
            name: 'Node1',
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, false);
        expect(res.node.id).toBe('n1');
        expect(res.node.label).toBe('Node1');
        expect(res.attachments).toHaveLength(0);
        expect(res.node.interfaces).toBeUndefined();
    });

    it('creates interface attachments when requested', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n2',
            name: 'N2',
            interfaces: [{ 'unique-id': 'i1', name: 'If1' }],
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, true);
        expect(res.node.interfaces).toBeDefined();
        expect(res.attachments).toHaveLength(1);
        expect(res.node.interfaces![0].label).toContain('If1');
        expect(res.attachments[0]).toEqual({ from: 'n2', to: 'n2__iface__i1' });
    });

    it('falls back to unique-id as node label if no name', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = { 'unique-id': 'nX' };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, false);
        expect(res.node.label).toBe('nX');
    });

    it('falls back to interface unique-id if no interface name', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n3',
            interfaces: [{ 'unique-id': 'ifaceOnly' }],
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, true);
        expect(res.node.interfaces![0].label).toContain('ifaceOnly');
        expect(res.attachments[0].to).toBe('n3__iface__ifaceOnly');
    });

    it('handles multiple interfaces and produces distinct attachments', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n4',
            interfaces: [
                { 'unique-id': 'api', name: 'API' },
                { 'unique-id': 'events', name: 'Events' },
            ],
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, true);
        expect(res.node.interfaces).toHaveLength(2);
        const ids = res.attachments.map(a => a.to).sort();
        expect(ids).toEqual(['n4__iface__api', 'n4__iface__events']);
    });

    it('ignores interfaces array if it is empty', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n5',
            interfaces: [],
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, true);
        expect(res.node.interfaces).toBeUndefined();
        expect(res.attachments).toHaveLength(0);
    });

    it('does not populate enrichment fields when enrichForReactFlow is false', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n6',
            name: 'Enriched Node',
            description: 'A description',
            controls: { 'ctrl-1': { description: 'Control 1', requirements: [] } },
            metadata: { aigf: { 'risk-level': 'high', risks: [{ name: 'Risk1' }], mitigations: [{ name: 'Mit1' }] } },
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, false, false);
        expect(res.node.description).toBeUndefined();
        expect(res.node.controls).toBeUndefined();
        expect(res.node.metadata).toBeUndefined();
        expect(res.node.riskLevel).toBeUndefined();
        expect(res.node.risks).toBeUndefined();
        expect(res.node.mitigations).toBeUndefined();
        expect(res.node.hasDetailedArchitecture).toBeUndefined();
    });

    it('populates enrichment fields when enrichForReactFlow is true', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n7',
            name: 'Enriched Node',
            description: 'A description',
            'node-type': 'service',
            controls: { 'ctrl-1': { description: 'Control 1', requirements: [] } },
            metadata: {
                aigf: {
                    'risk-level': 'high',
                    risks: [{ id: 'r1', name: 'Risk1', description: 'A risk' }],
                    mitigations: [{ id: 'm1', name: 'Mit1', description: 'A mitigation' }],
                },
            },
            details: { nodes: [], relationships: [] },
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, false, true);
        expect(res.node.description).toBe('A description');
        expect(res.node.controls).toEqual({ 'ctrl-1': { description: 'Control 1', requirements: [] } });
        expect(res.node.metadata).toBeDefined();
        expect(res.node.riskLevel).toBe('high');
        expect(res.node.risks).toEqual([{ id: 'r1', name: 'Risk1', description: 'A risk' }]);
        expect(res.node.mitigations).toEqual([{ id: 'm1', name: 'Mit1', description: 'A mitigation' }]);
        expect(res.node.hasDetailedArchitecture).toBe(true);
    });

    it('handles string-only risks and mitigations in AIGF metadata', () => {
        const f = new StandardVMNodeFactory();
        const node: Partial<CalmNodeCanonicalModel> = {
            'unique-id': 'n8',
            name: 'Node8',
            metadata: {
                aigf: {
                    risks: ['simple risk string'],
                    mitigations: ['simple mitigation string'],
                },
            },
        };
        const res = f.createLeafNode(node as CalmNodeCanonicalModel, false, true);
        expect(res.node.risks).toEqual([{ description: 'simple risk string' }]);
        expect(res.node.mitigations).toEqual([{ description: 'simple mitigation string' }]);
    });
});
