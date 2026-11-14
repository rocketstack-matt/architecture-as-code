import { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Handle,
    Position,
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type Node,
    type Edge,
    type NodeProps,
    type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import type { C4Element, C4Relationship, C4View } from './c4Projection.js';

// The usual C4 palette (Simon Brown's examples).
const C4_COLORS = {
    person: '#08427b',
    'software-system': '#1168bd',
    container: '#438dd5',
    component: '#85bbf0',
    external: '#8a8a8a',
};

const KIND_LABEL: Record<string, string> = {
    person: 'Person',
    'software-system': 'Software System',
    container: 'Container',
    component: 'Component',
};

const EXTERNAL_LABEL: Record<string, string> = {
    'outside-enterprise': 'outside the enterprise',
    'mapped-external': 'external type',
    'other-team': 'owned by another team',
};

const ELEMENT_WIDTH = 230;
const ELEMENT_HEIGHT = 140;
const BOUNDARY_PADDING = 36;

interface ElementData extends Record<string, unknown> {
    element: C4Element;
    inScope: boolean;
}

interface BoundaryData extends Record<string, unknown> {
    label: string;
    kind: string;
}

function fill(element: C4Element, inScope: boolean): string {
    if (element.external.length > 0) return C4_COLORS.external;
    if (element.kind === 'software-system' && !inScope) return C4_COLORS['software-system'];
    return C4_COLORS[element.kind as keyof typeof C4_COLORS] ?? C4_COLORS.container;
}

const SIDES = [
    { id: 't', position: Position.Top },
    { id: 'b', position: Position.Bottom },
    { id: 'l', position: Position.Left },
    { id: 'r', position: Position.Right },
];

function Handles() {
    return (
        <>
            {SIDES.map(({ id, position }) => (
                <span key={id}>
                    <Handle id={`${id}-s`} type="source" position={position} style={{ opacity: 0 }} />
                    <Handle id={`${id}-t`} type="target" position={position} style={{ opacity: 0 }} />
                </span>
            ))}
        </>
    );
}

function C4ElementNode({ data }: NodeProps<Node<ElementData>>) {
    const { element } = data;
    const background = fill(element, data.inScope);
    const darkText = background === C4_COLORS.component;
    const guessed = element.source === 'structure';
    const typeLine = `[${KIND_LABEL[element.kind] ?? element.kind}${element.nodeType ? `: ${element.nodeType}` : ''}]`;
    return (
        <div
            data-testid={`c4-element-${element.id}`}
            title={element.notes.join('\n') || undefined}
            style={{
                width: ELEMENT_WIDTH,
                height: ELEMENT_HEIGHT,
                background,
                color: darkText ? '#0b2540' : '#ffffff',
                borderRadius: element.kind === 'person' ? 28 : 8,
                border: guessed ? '2px dashed #f59e0b' : `1px solid ${darkText ? '#5a9bd5' : 'rgba(0,0,0,0.25)'}`,
                padding: '12px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxSizing: 'border-box',
                position: 'relative',
            }}
        >
            <Handles />
            {element.kind === 'person' && (
                <div
                    style={{
                        position: 'absolute',
                        top: -30,
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background,
                        border: '1px solid rgba(0,0,0,0.25)',
                    }}
                />
            )}
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: '18px' }}>{element.name}</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{typeLine}</div>
            <div
                style={{
                    fontSize: 11,
                    lineHeight: '14px',
                    marginTop: 6,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}
            >
                {element.description}
            </div>
            {(guessed || element.external.length > 0) && (
                <div style={{ position: 'absolute', top: -10, right: 8, display: 'flex', gap: 4 }}>
                    {guessed && <Chip background="#f59e0b" text="guessed" />}
                    {element.external.map((reason) => (
                        <Chip key={reason} background="#4b5563" text={EXTERNAL_LABEL[reason] ?? reason} />
                    ))}
                </div>
            )}
        </div>
    );
}

function Chip({ background, text }: { background: string; text: string }) {
    return (
        <span style={{ background, color: '#fff', fontSize: 10, borderRadius: 9, padding: '1px 7px', whiteSpace: 'nowrap' }}>
            {text}
        </span>
    );
}

function C4BoundaryNode({ data, width, height }: NodeProps<Node<BoundaryData>>) {
    return (
        <div
            style={{
                width,
                height,
                border: '2px dashed var(--calm-text-muted, #888)',
                borderRadius: 10,
                boxSizing: 'border-box',
                position: 'relative',
            }}
        >
            <div style={{ position: 'absolute', left: 12, bottom: 8, color: 'var(--calm-text-primary, #222)' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{data.label}</div>
                <div style={{ fontSize: 11, color: 'var(--calm-text-secondary, #555)' }}>[{data.kind}]</div>
            </div>
        </div>
    );
}

interface RelationshipData extends Record<string, unknown> {
    relationship: C4Relationship;
}

function shorten(text: string, max: number): string {
    const firstSentence = text.split(/(?<=\.)\s/)[0].replace(/\.$/, '');
    return firstSentence.length > max ? `${firstSentence.slice(0, max - 1).trimEnd()}…` : firstSentence;
}

function C4RelationshipEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd }: EdgeProps<Edge<RelationshipData>>) {
    const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
    const relationship = data!.relationship;
    return (
        <>
            <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: 'var(--calm-text-muted, #777)', strokeDasharray: '6 4' }} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        background: 'var(--calm-bg-base, #fff)',
                        color: 'var(--calm-text-primary, #222)',
                        fontSize: 10,
                        lineHeight: '13px',
                        padding: '2px 5px',
                        borderRadius: 4,
                        maxWidth: 170,
                        textAlign: 'center',
                    }}
                >
                    {shorten(relationship.label, 60)}
                    {relationship.count > 1 && ` (${relationship.count} relationships)`}
                    {relationship.technology && <div style={{ opacity: 0.75 }}>[{relationship.technology}]</div>}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

const nodeTypes = { c4element: C4ElementNode, c4boundary: C4BoundaryNode };
const edgeTypes = { c4relationship: C4RelationshipEdge };

function handlesFor(source: { x: number; y: number }, target: { x: number; y: number }) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    if (Math.abs(dy) >= Math.abs(dx) * 0.6) {
        return dy > 0 ? { sourceHandle: 'b-s', targetHandle: 't-t' } : { sourceHandle: 't-s', targetHandle: 'b-t' };
    }
    return dx > 0 ? { sourceHandle: 'r-s', targetHandle: 'l-t' } : { sourceHandle: 'l-s', targetHandle: 'r-t' };
}

interface Group {
    id: string;
    label: string;
    kind: string;
    members: C4Element[];
}

/** Lays out the view with dagre: each group is a cluster, everything else is a top-level node. */
export function layoutC4View(view: C4View, scopeId: string): { nodes: Node[]; edges: Edge[] } {
    const groups: Group[] = view.deployments
        ? view.deployments.map((d) => ({ id: `group:${d.node.id}`, label: d.node.name, kind: `Deployment Node: ${d.node.nodeType}`, members: d.hosted }))
        : view.boundary
          ? [{ id: `group:${view.boundary.id}`, label: view.boundary.name, kind: KIND_LABEL[view.boundary.kind] ?? view.boundary.kind, members: view.inside }]
          : [];
    const loose = view.outside;

    const g = new dagre.graphlib.Graph({ compound: true });
    g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 200, marginx: 20, marginy: 40 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const group of groups) {
        g.setNode(group.id, { paddingTop: BOUNDARY_PADDING, paddingBottom: BOUNDARY_PADDING + 30, paddingLeft: BOUNDARY_PADDING, paddingRight: BOUNDARY_PADDING });
        for (const member of group.members) {
            g.setNode(member.id, { width: ELEMENT_WIDTH, height: ELEMENT_HEIGHT });
            g.setParent(member.id, group.id);
        }
    }
    for (const element of loose) g.setNode(element.id, { width: ELEMENT_WIDTH, height: ELEMENT_HEIGHT });
    for (const rel of view.relationships) {
        if (g.hasNode(rel.source) && g.hasNode(rel.target)) g.setEdge(rel.source, rel.target);
    }
    dagre.layout(g);

    const nodes: Node[] = [];
    for (const group of groups) {
        const box = g.node(group.id);
        if (!box || group.members.length === 0) continue;
        nodes.push({
            id: group.id,
            type: 'c4boundary',
            position: { x: box.x - box.width / 2, y: box.y - box.height / 2 },
            width: box.width,
            height: box.height + 30,
            data: { label: group.label, kind: group.kind },
            zIndex: -1,
            selectable: false,
            draggable: false,
        });
    }
    const centres = new Map<string, { x: number; y: number }>();
    for (const element of [...groups.flatMap((group) => group.members), ...loose]) {
        const box = g.node(element.id);
        centres.set(element.id, { x: box.x, y: box.y });
        nodes.push({
            id: element.id,
            type: 'c4element',
            position: { x: box.x - ELEMENT_WIDTH / 2, y: box.y - ELEMENT_HEIGHT / 2 },
            data: { element, inScope: element.id === scopeId || element.parent === scopeId },
        });
    }
    const edges: Edge[] = view.relationships
        .filter((rel) => centres.has(rel.source) && centres.has(rel.target))
        .map((rel) => ({
            id: `${rel.source}->${rel.target}`,
            source: rel.source,
            target: rel.target,
            type: 'c4relationship',
            ...handlesFor(centres.get(rel.source)!, centres.get(rel.target)!),
            markerEnd: { type: 'arrowclosed' as const, color: '#777' },
            data: { relationship: rel },
        }));
    return { nodes, edges };
}

export function C4Diagram({ view, scopeId }: { view: C4View; scopeId: string }) {
    const { nodes, edges } = useMemo(() => layoutC4View(view, scopeId), [view, scopeId]);
    return (
        <ReactFlow
            key={`${scopeId}:${nodes.length}`}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
        >
            <Background gap={24} />
            <Controls showInteractive={false} />
        </ReactFlow>
    );
}
