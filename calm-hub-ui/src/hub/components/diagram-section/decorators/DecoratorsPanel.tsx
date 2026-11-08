import { useMemo } from 'react';
import { DecoratorCard, decoratorTypeLabel } from '../../../../decorator-renderer/index.js';
import type { ArchitectureDecoratorsState } from './useArchitectureDecorators.js';

interface DecoratorsPanelProps {
    state: ArchitectureDecoratorsState;
    /** Null shows every type. */
    typeFilter: string | null;
    /** Null shows every `$schema`. A view that matches on `$schema` sets it. */
    schemaFilter?: string | null;
    onTypeFilterChange: (type: string | null) => void;
    onSchemaFilterChange?: (schema: string | null) => void;
}

function Message({ children }: { children: string }) {
    return <p className="text-sm text-base-content/60 text-center py-8">{children}</p>;
}

export function DecoratorsPanel({ state, typeFilter, schemaFilter = null, onTypeFilterChange, onSchemaFilterChange }: DecoratorsPanelProps) {
    const all = useMemo(() => (state.status === 'loaded' ? state.decorators : []), [state]);
    const decorators = useMemo(
        () => (schemaFilter === null ? all : all.filter((decorator) => decorator.schema === schemaFilter)),
        [all, schemaFilter]
    );
    const typeCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const decorator of decorators) {
            const type = decoratorTypeLabel(decorator.type);
            counts.set(type, (counts.get(type) ?? 0) + 1);
        }
        // A type from a link stays selectable, so the filter shows what it hides.
        if (typeFilter !== null && !counts.has(typeFilter)) counts.set(typeFilter, 0);
        return [...counts].sort(([a], [b]) => a.localeCompare(b));
    }, [decorators, typeFilter]);
    const shown = typeFilter === null ? decorators : decorators.filter((decorator) => decoratorTypeLabel(decorator.type) === typeFilter);

    let body;
    if (state.status === 'loading') {
        body = <Message>Loading decorators…</Message>;
    } else if (state.status === 'error') {
        body = <Message>Could not load decorators.</Message>;
    } else if (all.length === 0) {
        body = <Message>No decorators for this architecture version.</Message>;
    } else if (shown.length === 0) {
        body = <Message>{typeFilter === null ? `No decorators with schema ${schemaFilter}.` : `No decorators of type ${typeFilter}.`}</Message>;
    } else {
        body = (
            <div className="flex flex-col gap-3">
                {shown.map((decorator, index) => (
                    <DecoratorCard key={`${decorator.uniqueId}-${index}`} decorator={decorator} />
                ))}
            </div>
        );
    }

    return (
        <div className="h-full bg-base-200 overflow-auto p-4 flex flex-col gap-3">
            {state.status === 'loaded' && schemaFilter !== null && all.length > 0 && (
                <div role="group" aria-label="Schema filter" className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-base-content/70">Schema</span>
                    <span className="badge badge-ghost font-mono break-all h-auto">{schemaFilter}</span>
                    {onSchemaFilterChange && (
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => onSchemaFilterChange(null)}>
                            Show all schemas
                        </button>
                    )}
                </div>
            )}
            {state.status === 'loaded' && decorators.length > 0 && (
                <label className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-base-content/70">Type</span>
                    <select
                        className="select select-sm w-full sm:w-auto"
                        value={typeFilter ?? ''}
                        onChange={(e) => onTypeFilterChange(e.target.value || null)}
                    >
                        <option value="">All types ({decorators.length})</option>
                        {typeCounts.map(([type, count]) => (
                            <option key={type} value={type}>
                                {type} ({count})
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {body}
        </div>
    );
}
