import { useMemo } from 'react';
import { DecoratorCard } from '../../../decorator-renderer/index.js';
import { useDecorators } from '../../context/DecoratorsContext.js';
import { Section } from './detail-components.js';

/** The decorators whose `applies-to` names the selected node or relationship. */
export function DecoratorsSection({ elementId }: { elementId: string }) {
    const decorators = useDecorators();
    const matching = useMemo(
        () => decorators.filter((decorator) => Array.isArray(decorator.appliesTo) && decorator.appliesTo.includes(elementId)),
        [decorators, elementId]
    );
    if (matching.length === 0) return null;
    return (
        <Section title="Decorators">
            <div className="flex flex-col gap-2">
                {matching.map((decorator, index) => (
                    <DecoratorCard key={`${decorator.uniqueId}-${index}`} decorator={decorator} />
                ))}
            </div>
        </Section>
    );
}
