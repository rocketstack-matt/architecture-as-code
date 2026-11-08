import { useMemo } from 'react';
import { DecoratorCard } from '../../../decorator-renderer/index.js';
import { useDecorators } from '../../context/DecoratorsContext.js';
import { Section } from './detail-components.js';

/**
 * The decorators whose `applies-to` names the selected node or relationship. A container also lists those of the
 * containment relationships that it draws, so it lists each decorator that its badges count.
 */
export function DecoratorsSection({ elementId }: { elementId: string }) {
    const { decorators, drawnAs } = useDecorators();
    const matching = useMemo(
        () => decorators.filter((decorator) => Array.isArray(decorator.appliesTo)
            && decorator.appliesTo.some((id) => id === elementId || drawnAs.get(id) === elementId)),
        [decorators, drawnAs, elementId]
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
