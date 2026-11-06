import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionsContext } from '../../../components/extensions/ExtensionsContext.js';
import type { ExtensionSummary } from '../../../model/extensions.js';
import { ExtensionService } from '../../../service/extension-service.js';
import { fakeExtension, fakeExtensions } from '../../../test-support/fake-extensions.js';
import { ExtensionCard } from './ExtensionCard.js';
import { IntroBrowse } from './IntroBrowse.js';

afterEach(() => vi.restoreAllMocks());

const stats = [
    { label: 'In flight', value: 1 },
    { label: 'Rolled back', value: 2 },
    { label: 'Reviews', value: 3 },
    { label: 'Hidden', value: 4 },
];

function renderCard(extension: ExtensionSummary) {
    return render(
        <MemoryRouter>
            <ExtensionCard extension={extension} />
        </MemoryRouter>
    );
}

describe('ExtensionCard', () => {
    it('shows the name, the provider and at most three figures, and opens the first screen', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({
            hubApi: 0,
            blocks: [{ type: 'stats', items: stats }, { type: 'cards', items: [{ title: 'Not on the card' }] }],
        });
        renderCard(fakeExtension(1));
        const card = screen.getByTestId('browse-extension');
        expect(card).toHaveAttribute('href', '/extensions/ext-1/screen');
        expect(card).toHaveTextContent('Extension 1');
        expect(card).toHaveTextContent('Provider 1');
        expect(await screen.findByText('Reviews')).toBeInTheDocument();
        expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
        expect(screen.queryByText('Not on the card')).not.toBeInTheDocument();
    });

    it('shows an alert on one line when there is no stats block', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [{ type: 'alert', text: 'Rolling out' }] });
        renderCard(fakeExtension(1));
        expect(await screen.findByText('Rolling out')).toHaveClass('truncate');
    });

    it('is not a link without a screen, and needs no landing card', () => {
        const call = vi.spyOn(ExtensionService.prototype, 'call');
        renderCard(fakeExtension(1, ['landing-card']));
        expect(screen.getByTestId('browse-extension').tagName).toBe('DIV');
        renderCard(fakeExtension(2, ['screen']));
        expect(screen.getAllByTestId('browse-extension')[1]).toHaveAttribute('href', '/extensions/ext-2/screen');
        expect(call).toHaveBeenCalledTimes(1);
    });

    it('shows the card without figures when the request fails', async () => {
        const call = vi.spyOn(ExtensionService.prototype, 'call').mockRejectedValue(new Error('down'));
        renderCard(fakeExtension(1));
        await waitFor(() => expect(call).toHaveBeenCalled());
        expect(screen.getByTestId('browse-extension')).toHaveTextContent('Extension 1');
        expect(screen.queryByRole('term')).not.toBeInTheDocument();
    });
});

describe('IntroBrowse extensions', () => {
    it('shows an Extensions section under Namespaces, for extensions with a landing card or a screen', () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
        render(
            <MemoryRouter>
                <ExtensionsContext.Provider value={[...fakeExtensions(10), fakeExtension(11, ['detail-panel'])]}>
                    <IntroBrowse
                        namespaceCounts={[{ namespace: 'demo', architectures: 1, patterns: 0, flows: 0, standards: 0, adrs: 0, interfaces: 0, total: 1 }]}
                        domainCounts={[]}
                    />
                </ExtensionsContext.Provider>
            </MemoryRouter>
        );
        const titles = screen.getAllByText(/^(Namespaces|Extensions)$/).map((el) => el.textContent);
        expect(titles).toEqual(['Namespaces', 'Extensions']);
        expect(screen.getAllByTestId('browse-extension')).toHaveLength(10);
    });

    it('shows extensions on an empty catalogue', () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
        render(
            <MemoryRouter>
                <ExtensionsContext.Provider value={fakeExtensions(1, ['screen'])}>
                    <IntroBrowse namespaceCounts={[]} domainCounts={[]} />
                </ExtensionsContext.Provider>
            </MemoryRouter>
        );
        expect(screen.getByTestId('browse-extension')).toBeInTheDocument();
    });
});
