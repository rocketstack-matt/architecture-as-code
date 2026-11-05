import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DecoratorsSection } from './DecoratorsSection.js';
import { DecoratorsContext } from '../../context/DecoratorsContext.js';
import type { Decorator } from '../../contracts/contracts.js';

const decorator = (uniqueId: string, appliesTo: string[]): Decorator => ({
    uniqueId,
    type: 'observability',
    target: ['/api/calm/namespaces/finos/architectures/1/versions/1-0-0'],
    appliesTo,
    data: { owner: uniqueId },
});

function renderSection(elementId: string, decorators: Decorator[]) {
    return render(
        <DecoratorsContext.Provider value={decorators}>
            <DecoratorsSection elementId={elementId} />
        </DecoratorsContext.Provider>
    );
}

describe('DecoratorsSection', () => {
    it('lists only the decorators that apply to the element', () => {
        renderSection('api', [decorator('d1', ['api', 'db']), decorator('d2', ['db']), decorator('d3', ['api'])]);
        expect(screen.getByRole('heading', { name: 'Decorators' })).toBeInTheDocument();
        expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
            'observability decorator d1',
            'observability decorator d3',
        ]);
    });

    it('renders nothing when no decorator applies to the element', () => {
        const { container } = renderSection('web', [decorator('d1', ['api'])]);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing outside a provider', () => {
        const { container } = render(<DecoratorsSection elementId="api" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('skips a decorator with no applies-to', () => {
        const broken = { ...decorator('d1', []), appliesTo: undefined } as unknown as Decorator;
        const { container } = renderSection('api', [broken]);
        expect(container).toBeEmptyDOMElement();
    });
});
