import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../../../../authService.js';
import { C4Diagram } from './C4Diagram.js';
import {
    CALM_DEFAULT_C4_MAPPING,
    buildView,
    projectC4,
    scopesFor,
    type C4Level,
    type C4Mapping,
    type CalmArchitectureLike,
} from './c4Projection.js';

// Prototype for #3728. A real build reads the namespace's `c4-mapping` config (#3727).
const EXAMPLE_FLUXNOVA_MAPPING: C4Mapping = {
    'unique-id': 'example-fluxnova-c4-mapping',
    'node-types': {
        ...CALM_DEFAULT_C4_MAPPING['node-types'],
        'fluxnova:platform': 'software-system',
        'fluxnova:engine': 'container',
        'fluxnova:rest-api': 'container',
        'fluxnova:cockpit': 'container',
        'fluxnova:admin': 'container',
        'fluxnova:tasklist': 'container',
        'fluxnova:process-db': 'container',
        'fluxnova:external-task-worker': 'container',
    },
    nesting: 'demote',
};

const MAPPINGS: Record<string, { label: string; mapping: C4Mapping }> = {
    default: { label: 'CALM default (calm-schema#53)', mapping: CALM_DEFAULT_C4_MAPPING },
    fluxnova: { label: 'Example: FluxNova types', mapping: EXAMPLE_FLUXNOVA_MAPPING },
};

const LEVELS: { id: C4Level; label: string }[] = [
    { id: 'context', label: 'Context' },
    { id: 'container', label: 'Container' },
    { id: 'component', label: 'Component' },
    { id: 'deployment', label: 'Deployment' },
];

export const C4_TAB_PARAMS = ['level', 'scope', 'mapping'] as const;

function hubPath(reference: string): string | undefined {
    const match = /\/calm\/namespaces\/[^/]+\/architectures\/.+$/.exec(reference);
    return match?.[0];
}

/** Adds the nodes of each Hub `detailed-architecture` one level down, composed into the node that links them. */
function useExpandedArchitecture(architecture: CalmArchitectureLike | undefined): CalmArchitectureLike | undefined {
    const [children, setChildren] = useState<Record<string, CalmArchitectureLike>>({});
    useEffect(() => {
        let cancelled = false;
        const links = (architecture?.nodes ?? [])
            .map((n) => ({ id: n['unique-id'], path: hubPath(n.details?.['detailed-architecture'] ?? '') }))
            .filter((l): l is { id: string; path: string } => !!l.path);
        Promise.all(
            links.map(async (link) => {
                const headers = await getAuthHeaders();
                const res = await axios.get(link.path, { headers }).catch(() => undefined);
                return [link.id, res?.data] as const;
            })
        ).then((loaded) => {
            if (!cancelled) setChildren(Object.fromEntries(loaded.filter(([, doc]) => doc?.nodes)));
        });
        return () => {
            cancelled = true;
        };
    }, [architecture]);

    return useMemo(() => {
        if (!architecture) return undefined;
        const nodes = [...(architecture.nodes ?? [])];
        const relationships = [...(architecture.relationships ?? [])];
        for (const [parent, child] of Object.entries(children)) {
            const prefix = (id: string) => `${parent}/${id}`;
            const childIds = (child.nodes ?? []).map((n) => n['unique-id']);
            nodes.push(...(child.nodes ?? []).map((n) => ({ ...n, 'unique-id': prefix(n['unique-id']) })));
            relationships.push({
                'unique-id': `${parent}/__detailed-architecture`,
                'relationship-type': { 'composed-of': { container: parent, nodes: childIds.map(prefix) } },
            });
            for (const rel of child.relationships ?? []) {
                const t = rel['relationship-type'];
                relationships.push({
                    ...rel,
                    'unique-id': prefix(rel['unique-id']),
                    'relationship-type': {
                        connects: t.connects && { source: { node: prefix(t.connects.source.node) }, destination: { node: prefix(t.connects.destination.node) } },
                        interacts: t.interacts && { actor: prefix(t.interacts.actor), nodes: t.interacts.nodes.map(prefix) },
                        'composed-of': t['composed-of'] && { container: prefix(t['composed-of'].container), nodes: t['composed-of'].nodes.map(prefix) },
                        'deployed-in': t['deployed-in'] && { container: prefix(t['deployed-in'].container), nodes: t['deployed-in'].nodes.map(prefix) },
                    },
                });
            }
        }
        return { ...architecture, nodes, relationships };
    }, [architecture, children]);
}

interface C4TabProps {
    architecture: CalmArchitectureLike | undefined;
    namespace: string;
    architectureName?: string;
    searchParams: URLSearchParams;
    setTabParams: (params: Record<string, string>) => void;
}

export function C4Tab({ architecture, namespace, architectureName, searchParams, setTabParams }: C4TabProps) {
    const expanded = useExpandedArchitecture(architecture);
    const mappingId = MAPPINGS[searchParams.get('mapping') ?? ''] ? searchParams.get('mapping')! : 'default';
    const level = (LEVELS.find((l) => l.id === searchParams.get('level'))?.id ?? 'context') as C4Level;

    const model = useMemo(
        () => (expanded ? projectC4(expanded, { mapping: MAPPINGS[mappingId].mapping, namespace, architectureName }) : undefined),
        [expanded, mappingId, namespace, architectureName]
    );
    const scopes = useMemo(() => (model ? scopesFor(model, level) : []), [model, level]);
    const requestedScope = searchParams.get('scope');
    const scope = scopes.find((s) => s.id === requestedScope) ?? scopes[0];
    const view = useMemo(
        () => (model && (scope || level === 'deployment') ? buildView(model, level, scope?.id ?? '') : undefined),
        [model, level, scope]
    );

    if (!model) return <div className="p-6 text-sm">This tab shows architectures only.</div>;

    const update = (changes: Record<string, string | undefined>) => {
        const next: Record<string, string> = {};
        for (const name of C4_TAB_PARAMS) {
            const value = name in changes ? changes[name] : (searchParams.get(name) ?? undefined);
            if (value) next[name] = value;
        }
        setTabParams(next);
    };

    const guessed = [...model.elements.values()].filter((e) => e.source === 'structure').length;
    const empty =
        !view ||
        (view.deployments ? view.deployments.length === 0 : view.inside.length === 0 && view.outside.length === 0);

    return (
        <div className="h-full flex flex-col" data-testid="c4-tab">
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-base-300 bg-base-100 text-sm">
                <div role="radiogroup" aria-label="C4 level" className="join">
                    {LEVELS.map((l) => (
                        <button
                            key={l.id}
                            role="radio"
                            aria-checked={l.id === level}
                            className={`join-item btn btn-xs ${l.id === level ? 'btn-primary' : 'btn-ghost border-base-300'}`}
                            onClick={() => update({ level: l.id, scope: undefined })}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
                {level !== 'deployment' && scopes.length > 0 && (
                    <label className="flex items-center gap-1">
                        <span className="opacity-70">{level === 'component' ? 'Container' : 'System'}</span>
                        <select
                            className="select select-xs select-bordered"
                            value={scope?.id}
                            onChange={(e) => update({ scope: e.target.value })}
                        >
                            {scopes.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <label className="flex items-center gap-1">
                    <span className="opacity-70">Mapping</span>
                    <select
                        className="select select-xs select-bordered"
                        value={mappingId}
                        onChange={(e) => update({ mapping: e.target.value === 'default' ? undefined : e.target.value })}
                    >
                        {Object.entries(MAPPINGS).map(([id, m]) => (
                            <option key={id} value={id}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </label>
                <span className="ml-auto flex items-center gap-2 text-xs">
                    {guessed > 0 ? (
                        <span className="badge badge-warning badge-sm">{guessed} guessed from structure</span>
                    ) : (
                        <span className="badge badge-success badge-sm">every element mapped</span>
                    )}
                    <span className="badge badge-ghost badge-sm">Prototype</span>
                </span>
            </div>
            <div className="flex-1 min-h-0 relative">
                {empty ? (
                    <div className="p-6 text-sm opacity-70">
                        {level === 'deployment'
                            ? 'This architecture has no deployed-in relationships or deployment nodes.'
                            : `No ${level} diagram: nothing in this architecture sits at this level.`}
                    </div>
                ) : (
                    <C4Diagram view={view!} scopeId={scope?.id ?? ''} />
                )}
                {model.notes.length > 0 && (
                    <details className="absolute right-3 bottom-3 max-w-sm bg-base-100 border border-base-300 rounded-lg text-xs shadow">
                        <summary className="cursor-pointer px-3 py-2">{model.notes.length} notes from the projection</summary>
                        <ul className="px-4 pb-3 list-disc space-y-1 max-h-48 overflow-auto">
                            {model.notes.map((n, i) => (
                                <li key={i}>
                                    <b>{model.elements.get(n.elementId)?.name}</b>: {n.text}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>
        </div>
    );
}
