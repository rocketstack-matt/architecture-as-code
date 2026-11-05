import { useState } from 'react';
import { DecoratorValue } from './DecoratorValue.js';
import { isWebUrl } from './value-shape.js';

/** The decorator fields the renderer reads. Kept structural so the renderer does not depend on Hub types. */
export interface RenderableDecorator {
    uniqueId: string;
    type: string;
    schema?: string;
    target?: string[];
    appliesTo?: string[];
    data: unknown;
}

export function DecoratorCard({ decorator }: { decorator: RenderableDecorator }) {
    const [view, setView] = useState<'data' | 'json'>('data');
    const appliesTo = Array.isArray(decorator.appliesTo) ? decorator.appliesTo : [];
    const toggleClass = (active: boolean) => `join-item btn btn-xs ${active ? 'btn-active' : ''}`;

    return (
        <article className="card card-border bg-base-100 text-sm" aria-label={`${decorator.type} decorator ${decorator.uniqueId}`}>
            <div className="card-body p-3 gap-2">
                <header className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-primary badge-soft badge-sm font-semibold">{decorator.type}</span>
                    <span className="font-mono text-xs text-base-content/60 break-all flex-1 min-w-0">{decorator.uniqueId}</span>
                    <div className="join" role="group" aria-label="Decorator view">
                        <button type="button" aria-pressed={view === 'data'} className={toggleClass(view === 'data')} onClick={() => setView('data')}>
                            Data
                        </button>
                        <button type="button" aria-pressed={view === 'json'} className={toggleClass(view === 'json')} onClick={() => setView('json')}>
                            JSON
                        </button>
                    </div>
                </header>
                {decorator.schema && (
                    <div className="text-xs text-base-content/60 break-all">
                        Schema:{' '}
                        {isWebUrl(decorator.schema) ? (
                            <a href={decorator.schema} target="_blank" rel="noopener noreferrer" className="link">
                                {decorator.schema}
                            </a>
                        ) : (
                            decorator.schema
                        )}
                    </div>
                )}
                {appliesTo.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                        <span className="text-base-content/50">Applies to</span>
                        {appliesTo.map((id, index) => (
                            <span key={`${id}-${index}`} className="badge badge-ghost badge-sm font-mono">
                                {id}
                            </span>
                        ))}
                    </div>
                )}
                {view === 'data' ? (
                    <DecoratorValue value={decorator.data} />
                ) : (
                    <pre className="text-xs font-mono bg-base-200 rounded-box p-2 overflow-auto max-h-96 m-0">
                        {JSON.stringify(decorator, null, 2)}
                    </pre>
                )}
            </div>
        </article>
    );
}
