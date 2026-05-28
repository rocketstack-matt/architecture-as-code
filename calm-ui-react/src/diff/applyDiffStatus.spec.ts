import { describe, it, expect } from 'vitest'
import type { Node, Edge } from 'reactflow'
import type { DiffResult } from '@finos/calm-models/diff'
import { applyDiffStatus } from './applyDiffStatus.js'

const nodeRef = (uniqueId: string): Node => ({
    id: uniqueId,
    position: { x: 0, y: 0 },
    data: { 'unique-id': uniqueId, name: uniqueId, 'node-type': 'system' },
})

const edgeRef = (uniqueId: string, source: string, target: string): Edge => ({
    id: uniqueId,
    source,
    target,
    data: {
        'unique-id': uniqueId,
        'relationship-type': { connects: { source: { node: source }, destination: { node: target } } },
    },
})

const emptyDiff: DiffResult = {
    nodesAdded: [],
    nodesRemoved: [],
    nodesModified: [],
    nodesRenamed: [],
    edgesAdded: [],
    edgesRemoved: [],
    edgesModified: [],
    edgesRenamed: [],
    metadataChanged: false,
    flowsAdded: [],
    flowsRemoved: [],
    flowsModified: [],
    controlsAdded: [],
    controlsRemoved: [],
    controlsModified: [],
} as unknown as DiffResult

describe('applyDiffStatus', () => {
    it('returns the parsed input unchanged when diffResult is null', () => {
        const parsed = { nodes: [nodeRef('a')], edges: [edgeRef('e1', 'a', 'a')] }
        expect(applyDiffStatus(parsed, null, true)).toBe(parsed)
    })

    it('marks removed nodes when rendering the "first" side', () => {
        const parsed = { nodes: [nodeRef('drop-me')], edges: [] }
        const diff = {
            ...emptyDiff,
            nodesRemoved: [{ 'unique-id': 'drop-me', name: 'drop-me', 'node-type': 'system' }],
        } as unknown as DiffResult

        const out = applyDiffStatus(parsed, diff, true)
        expect((out.nodes[0].data as { diffStatus: string }).diffStatus).toBe('removed')
    })

    it('marks added nodes when rendering the "second" side', () => {
        const parsed = { nodes: [nodeRef('new-node')], edges: [] }
        const diff = {
            ...emptyDiff,
            nodesAdded: [{ 'unique-id': 'new-node', name: 'new-node', 'node-type': 'system' }],
        } as unknown as DiffResult

        const out = applyDiffStatus(parsed, diff, false)
        expect((out.nodes[0].data as { diffStatus: string }).diffStatus).toBe('added')
    })

    it('marks renamed nodes and captures the original id on the first side', () => {
        const parsed = { nodes: [nodeRef('new-name')], edges: [] }
        const diff = {
            ...emptyDiff,
            nodesRenamed: [{ oldId: 'old-name', newId: 'new-name' }],
        } as unknown as DiffResult

        const out = applyDiffStatus(parsed, diff, true)
        const data = out.nodes[0].data as { diffStatus: string; originalId: string }
        expect(data.diffStatus).toBe('renamed')
        expect(data.originalId).toBe('old-name')
    })

    it('marks modified edges on both sides', () => {
        const parsed = { nodes: [], edges: [edgeRef('e-mod', 'a', 'b')] }
        const diff = {
            ...emptyDiff,
            edgesModified: [
                {
                    original: { 'unique-id': 'e-mod' },
                    updated: { 'unique-id': 'e-mod' },
                },
            ],
        } as unknown as DiffResult

        const outFirst = applyDiffStatus(parsed, diff, true)
        const outSecond = applyDiffStatus(parsed, diff, false)
        expect((outFirst.edges[0].data as { diffStatus: string }).diffStatus).toBe('modified')
        expect((outSecond.edges[0].data as { diffStatus: string }).diffStatus).toBe('modified')
    })
})
