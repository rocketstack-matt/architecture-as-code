// Prototype for finos/architecture-as-code#3728. #3728 puts this projection in
// @finos/calm-models; it lives here only while the design is being tried out.

export type C4Kind =
    | 'person'
    | 'software-system'
    | 'container'
    | 'component'
    | 'deployment-node'
    | 'enterprise-boundary'
    | 'hidden';

export type C4MappingEntry = C4Kind | { kind: C4Kind; external?: boolean };

export interface C4Mapping {
    'unique-id': string;
    'node-types': Record<string, C4MappingEntry>;
    nesting?: 'demote' | 'strict';
}

/** The default mapping of the proposed standard (finos/calm-schema#53). */
export const CALM_DEFAULT_C4_MAPPING: C4Mapping = {
    'unique-id': 'calm-default',
    'node-types': {
        actor: 'person',
        system: 'software-system',
        service: 'container',
        database: 'container',
        webclient: 'container',
        'data-asset': 'container',
        ldap: 'container',
        ecosystem: 'enterprise-boundary',
        network: 'deployment-node',
    },
    nesting: 'demote',
};

/** Where an element's C4 kind came from. `structure` means the projection guessed it. */
export type KindSource = 'mapping' | 'structure' | 'implicit';

export type ExternalReason = 'outside-enterprise' | 'mapped-external' | 'other-team';

export interface C4Element {
    id: string;
    name: string;
    description: string;
    nodeType: string;
    kind: C4Kind;
    source: KindSource;
    /** The element that holds it through `composed-of`, with enterprise boundaries skipped. */
    parent?: string;
    external: ExternalReason[];
    detailedArchitecture?: string;
    notes: string[];
}

export interface C4Relationship {
    source: string;
    target: string;
    label: string;
    technology?: string;
    count: number;
}

export interface C4Model {
    elements: Map<string, C4Element>;
    relationships: C4Relationship[];
    /** Node id → the node it is `deployed-in`. */
    deployedIn: Map<string, string>;
    hasEnterpriseBoundary: boolean;
    notes: { elementId: string; text: string }[];
}

export const IMPLICIT_SYSTEM_ID = '__c4-implicit-system__';

interface CalmNodeLike {
    'unique-id': string;
    'node-type': string;
    name?: string;
    description?: string;
    details?: { 'detailed-architecture'?: string };
}

interface CalmRelationshipLike {
    'unique-id': string;
    description?: string;
    protocol?: string;
    'relationship-type': {
        connects?: { source: { node: string }; destination: { node: string } };
        interacts?: { actor: string; nodes: string[] };
        'composed-of'?: { container: string; nodes: string[] };
        'deployed-in'?: { container: string; nodes: string[] };
    };
}

export interface CalmArchitectureLike {
    title?: string;
    nodes?: CalmNodeLike[];
    relationships?: CalmRelationshipLike[];
}

const LEVEL: Partial<Record<C4Kind, number>> = { 'software-system': 1, container: 2, component: 3 };
const KIND_AT_LEVEL: Record<number, C4Kind> = { 1: 'software-system', 2: 'container', 3: 'component' };

function mappedEntry(mapping: C4Mapping, nodeType: string): { kind: C4Kind; external: boolean } | undefined {
    const entry = mapping['node-types'][nodeType];
    if (entry === undefined) return undefined;
    return typeof entry === 'string' ? { kind: entry, external: false } : { kind: entry.kind, external: !!entry.external };
}

/** `/calm/namespaces/{ns}/architectures/...` in a CALM Hub URL, absolute or not. */
function hubNamespaceOf(reference: string): string | undefined {
    return /\/calm\/namespaces\/([^/]+)\/architectures\//.exec(reference)?.[1];
}

function isSameOrBelow(namespace: string, owner: string): boolean {
    return namespace === owner || namespace.startsWith(`${owner}.`);
}

export function projectC4(
    architecture: CalmArchitectureLike,
    options: { mapping?: C4Mapping; namespace?: string; architectureName?: string } = {}
): C4Model {
    const mapping = options.mapping ?? CALM_DEFAULT_C4_MAPPING;
    const nodes = new Map((architecture.nodes ?? []).map((n) => [n['unique-id'], n]));
    const relationships = architecture.relationships ?? [];

    const composedParent = new Map<string, string>();
    const deployedIn = new Map<string, string>();
    for (const rel of relationships) {
        const composed = rel['relationship-type']['composed-of'];
        if (composed && nodes.has(composed.container)) {
            for (const child of composed.nodes) {
                if (nodes.has(child) && child !== composed.container && !composedParent.has(child)) {
                    composedParent.set(child, composed.container);
                }
            }
        }
        const deployed = rel['relationship-type']['deployed-in'];
        if (deployed && nodes.has(deployed.container)) {
            for (const child of deployed.nodes) if (nodes.has(child)) deployedIn.set(child, deployed.container);
        }
    }

    const mappedKind = (id: string) => mappedEntry(mapping, nodes.get(id)!['node-type']);
    const isBoundary = (id: string) => mappedKind(id)?.kind === 'enterprise-boundary';

    /** The composed-of chain, nearest first. Cycle-safe. */
    const ancestors = (id: string): string[] => {
        const chain: string[] = [];
        const seen = new Set([id]);
        let current = composedParent.get(id);
        while (current && !seen.has(current)) {
            chain.push(current);
            seen.add(current);
            current = composedParent.get(current);
        }
        return chain;
    };

    const elements = new Map<string, C4Element>();
    const notes: { elementId: string; text: string }[] = [];
    const note = (element: C4Element, text: string) => {
        element.notes.push(text);
        notes.push({ elementId: element.id, text });
    };

    // Parents are resolved before children so a child can read its parent's kind.
    const resolve = (id: string): C4Element => {
        const existing = elements.get(id);
        if (existing) return existing;
        const node = nodes.get(id)!;
        const parent = ancestors(id).find((a) => !isBoundary(a));
        const parentElement = parent ? resolve(parent) : undefined;
        const mapped = mappedKind(id);
        const hasChildren = [...composedParent.entries()].some(([, p]) => p === id);

        let kind: C4Kind;
        let source: KindSource;
        const element: C4Element = {
            id,
            name: node.name ?? id,
            description: node.description ?? '',
            nodeType: node['node-type'],
            kind: 'hidden',
            source: 'mapping',
            parent,
            external: [],
            detailedArchitecture: node.details?.['detailed-architecture'],
            notes: [],
        };
        elements.set(id, element);

        const parentLevel = parentElement ? (LEVEL[parentElement.kind] ?? 0) : 0;
        if (mapped) {
            kind = mapped.kind;
            source = 'mapping';
            const level = LEVEL[kind];
            if (level !== undefined && parentElement && level <= parentLevel) {
                if ((mapping.nesting ?? 'demote') === 'demote' && parentLevel < 3) {
                    kind = KIND_AT_LEVEL[parentLevel + 1];
                    note(element, `Mapped as ${mapped.kind}, shown as ${kind} because it sits inside ${parentElement.kind} "${parentElement.name}"`);
                } else {
                    note(element, `Mapped as ${mapped.kind}, but it sits inside ${parentElement.kind} "${parentElement.name}"`);
                }
            }
            if (kind === 'person' && parentElement) {
                note(element, `A person inside ${parentElement.kind} "${parentElement.name}"`);
            }
        } else {
            source = 'structure';
            if (!parentElement) kind = 'software-system';
            else kind = KIND_AT_LEVEL[Math.min(parentLevel + 1, 3)] ?? 'container';
            if (!parentElement && !hasChildren) kind = 'software-system';
        }
        element.kind = kind;
        element.source = source;
        if (mapped?.external) element.external.push('mapped-external');

        const reference = element.detailedArchitecture;
        const owner = reference ? hubNamespaceOf(reference) : undefined;
        if (owner && options.namespace && !isSameOrBelow(options.namespace, owner)) {
            element.external.push('other-team');
            if (element.kind !== 'software-system') {
                note(element, `Owned by namespace ${owner}, so it is shown as an external software system, not a ${element.kind}`);
                element.kind = 'software-system';
            }
        }
        return element;
    };
    for (const id of nodes.keys()) resolve(id);

    // A container that no software system holds belongs to an implicit system named after the
    // architecture. #53 does not cover this case yet; the prototype tries this rule.
    const orphans = [...elements.values()].filter((e) => !e.parent && (e.kind === 'container' || e.kind === 'component'));
    if (orphans.length > 0) {
        const implicit: C4Element = {
            id: IMPLICIT_SYSTEM_ID,
            name: architecture.title ?? options.architectureName ?? 'Implicit system',
            description: 'Implicit software system: the containers that no software system in the model holds',
            nodeType: '',
            kind: 'software-system',
            source: 'implicit',
            external: [],
            notes: [],
        };
        elements.set(implicit.id, implicit);
        for (const orphan of orphans) {
            orphan.parent = IMPLICIT_SYSTEM_ID;
            note(orphan, `No software system holds this ${orphan.kind}, so it is shown in the implicit system "${implicit.name}"`);
        }
    }

    const hasEnterpriseBoundary = [...nodes.keys()].some(isBoundary);
    if (hasEnterpriseBoundary) {
        for (const element of elements.values()) {
            if (element.kind === 'enterprise-boundary' || element.kind === 'deployment-node') continue;
            const members = element.id === IMPLICIT_SYSTEM_ID ? orphans.map((o) => o.id) : [element.id];
            const inside = members.some((m) => ancestors(m).some(isBoundary));
            if (!inside) element.external.push('outside-enterprise');
        }
    }

    const lifted = new Map<string, C4Relationship>();
    const add = (source: string, target: string, label: string, technology?: string) => {
        const key = `${source}->${target}`;
        const existing = lifted.get(key);
        if (existing) existing.count++;
        else lifted.set(key, { source, target, label, technology, count: 1 });
    };
    for (const rel of relationships) {
        const type = rel['relationship-type'];
        if (type.connects && nodes.has(type.connects.source.node) && nodes.has(type.connects.destination.node)) {
            add(type.connects.source.node, type.connects.destination.node, rel.description ?? 'Uses', rel.protocol);
        }
        if (type.interacts && nodes.has(type.interacts.actor)) {
            for (const target of type.interacts.nodes) {
                if (nodes.has(target)) add(type.interacts.actor, target, rel.description ?? 'Uses', rel.protocol);
            }
        }
    }

    return { elements, relationships: [...lifted.values()], deployedIn, hasEnterpriseBoundary, notes };
}

/** The element's chain from the top down, including itself. */
export function chainOf(model: C4Model, id: string): string[] {
    const chain: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current && !seen.has(current)) {
        chain.unshift(current);
        seen.add(current);
        current = model.elements.get(current)?.parent;
    }
    return chain;
}

export type C4Level = 'context' | 'container' | 'component' | 'deployment';
export const LANDSCAPE_SCOPE = '__landscape__';

export interface C4View {
    /** The boundary drawn around the inside elements. Absent at context level and in the landscape. */
    boundary?: C4Element;
    inside: C4Element[];
    outside: C4Element[];
    relationships: C4Relationship[];
    /** Deployment view only: each deployment node and what is deployed in it. */
    deployments?: { node: C4Element; hosted: C4Element[] }[];
}

const DRAWN: ReadonlySet<C4Kind> = new Set(['person', 'software-system', 'container', 'component']);

function liftRelationships(model: C4Model, representative: (id: string) => string | undefined, keep: (s: string, t: string) => boolean) {
    const merged = new Map<string, C4Relationship>();
    for (const rel of model.relationships) {
        const source = representative(rel.source);
        const target = representative(rel.target);
        if (!source || !target || source === target || !keep(source, target)) continue;
        const key = `${source}->${target}`;
        const existing = merged.get(key);
        if (existing) existing.count += rel.count;
        else merged.set(key, { ...rel, source, target });
    }
    return [...merged.values()];
}

/** Scopes a reader can pick at a level: elements with something inside them to show. */
export function scopesFor(model: C4Model, level: C4Level): C4Element[] {
    const all = [...model.elements.values()];
    const hasChildren = (e: C4Element) => all.some((child) => child.parent === e.id && DRAWN.has(child.kind));
    if (level === 'component') return all.filter((e) => e.kind === 'container' && hasChildren(e));
    const systems = all.filter((e) => e.kind === 'software-system');
    // A system owned by another team has children only when the tab expanded its detailed architecture.
    if (level === 'container') return systems.filter(hasChildren);
    const own = systems.filter((e) => !e.external.includes('other-team'));
    return [...own.filter(hasChildren), ...own.filter((e) => !hasChildren(e))];
}

export function buildView(model: C4Model, level: C4Level, scopeId: string): C4View {
    const element = (id: string) => model.elements.get(id)!;

    if (level === 'deployment') {
        const hostIds = new Set([
            ...model.deployedIn.values(),
            ...[...model.elements.values()].filter((e) => e.kind === 'deployment-node').map((e) => e.id),
        ]);
        const deployments = [...hostIds].map((host) => ({
            node: element(host),
            hosted: [...model.deployedIn.entries()].filter(([, h]) => h === host).map(([id]) => element(id)),
        }));
        const hostedIds = new Set(deployments.flatMap((d) => d.hosted.map((h) => h.id)));
        const relationships = liftRelationships(model, (id) => (hostedIds.has(id) ? id : undefined), () => true);
        return { inside: [], outside: [], relationships, deployments };
    }

    const ownedElsewhere = (id: string) => element(id).external.includes('other-team');

    if (scopeId === LANDSCAPE_SCOPE || level === 'context') {
        const top = (id: string) => {
            const chain = chainOf(model, id);
            const head = chain.find(ownedElsewhere) ?? chain[0];
            return DRAWN.has(element(head).kind) ? head : undefined;
        };
        const relationships = liftRelationships(model, top, (s, t) => scopeId === LANDSCAPE_SCOPE || s === scopeId || t === scopeId);
        const ids = new Set(relationships.flatMap((r) => [r.source, r.target]));
        if (scopeId !== LANDSCAPE_SCOPE) ids.add(scopeId);
        else for (const e of model.elements.values()) if (!e.parent && DRAWN.has(e.kind)) ids.add(e.id);
        return { inside: [], outside: [...ids].map(element), relationships };
    }

    // Inside a scope: its children, and whatever they talk to, lifted to the highest element
    // that is not an ancestor of the scope.
    const scopeChain = new Set(chainOf(model, scopeId));
    const representative = (id: string) => {
        const chain = chainOf(model, id).filter((c) => !scopeChain.has(c));
        const head = chain.find(ownedElsewhere) ?? chain[0];
        return head && DRAWN.has(element(head).kind) ? head : undefined;
    };
    const isInside = (id: string) => element(id).parent === scopeId && !ownedElsewhere(id);
    const relationships = liftRelationships(model, representative, (s, t) => isInside(s) || isInside(t));
    const inside = [...model.elements.values()].filter((e) => isInside(e.id) && DRAWN.has(e.kind));
    const outsideIds = new Set(relationships.flatMap((r) => [r.source, r.target]).filter((id) => !isInside(id)));
    return { boundary: element(scopeId), inside, outside: [...outsideIds].map(element), relationships };
}
