import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IntroSearchBar } from './IntroSearchBar.js';
import { SearchService } from '../../../service/search-service.js';
import { GroupedSearchResults } from '../../../model/search.js';

const emptyResults: GroupedSearchResults = {
    architectures: [],
    patterns: [],
    flows: [],
    standards: [],
    interfaces: [],
    controls: [],
    adrs: [],
};

// A control result: controls route by name with no version lookup, so navigation
// is deterministic without stubbing CalmService.
const controlResults: GroupedSearchResults = {
    ...emptyResults,
    controls: [{ namespace: 'security', id: 7, name: 'PCI-DSS', description: 'Encryption at rest' }],
};

// One group with a registry icon (flows) and one visual type without (architectures),
// so the header-icon test can assert both treatments in a single dropdown.
const iconGroupResults: GroupedSearchResults = {
    ...emptyResults,
    architectures: [{ namespace: 'finos', id: 1, name: 'Test Architecture', description: 'A test architecture' }],
    flows: [{ namespace: 'finos', id: 3, name: 'Trade Flow', description: 'A test flow' }],
};

function createMockSearchService(searchFn: (q: string) => Promise<GroupedSearchResults>) {
    return { search: searchFn } as unknown as SearchService;
}

function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderBar(searchService?: SearchService) {
    return render(
        <MemoryRouter initialEntries={['/']}>
            <IntroSearchBar searchService={searchService} />
            <LocationProbe />
        </MemoryRouter>
    );
}

describe('IntroSearchBar', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('navigates to the results page when the query is submitted with Enter', () => {
        renderBar(createMockSearchService(vi.fn().mockResolvedValue(emptyResults)));

        const input = screen.getByLabelText('Search the architecture catalogue');
        fireEvent.change(input, { target: { value: 'payments' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(screen.getByTestId('location')).toHaveTextContent('/search?q=payments');
    });

    it('navigates to the results page when the Search button is clicked', () => {
        renderBar(createMockSearchService(vi.fn().mockResolvedValue(emptyResults)));

        const input = screen.getByLabelText('Search the architecture catalogue');
        fireEvent.change(input, { target: { value: 'a b' } });
        fireEvent.click(screen.getByLabelText('Search'));

        // The space is percent-encoded in the query string.
        expect(screen.getByTestId('location')).toHaveTextContent('/search?q=a%20b');
    });

    it('does not submit an empty/whitespace query', () => {
        renderBar(createMockSearchService(vi.fn().mockResolvedValue(emptyResults)));

        const input = screen.getByLabelText('Search the architecture catalogue');
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(screen.getByTestId('location')).toHaveTextContent('/');
        expect(screen.getByTestId('location')).not.toHaveTextContent('/search');
    });

    it('deep-links to a selected dropdown result instead of the results page', async () => {
        renderBar(createMockSearchService(vi.fn().mockResolvedValue(controlResults)));

        const input = screen.getByLabelText('Search the architecture catalogue');
        await act(async () => {
            fireEvent.change(input, { target: { value: 'pci' } });
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        fireEvent.mouseDown(screen.getByText('PCI-DSS'));

        expect(screen.getByTestId('location')).toHaveTextContent('/security/controls/PCI-DSS/detail');
    });

    it('shows the registry type icon on group headers that have one, label-only otherwise', async () => {
        renderBar(createMockSearchService(vi.fn().mockResolvedValue(iconGroupResults)));

        const input = screen.getByLabelText('Search the architecture catalogue');
        await act(async () => {
            fireEvent.change(input, { target: { value: 'test' } });
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        // Flows carries its registry glyph in the group header...
        expect(screen.getByTestId('search-group-icon-flows')).toBeInTheDocument();
        // ...but Architectures (a visual type with no registry icon) stays label-only.
        expect(screen.getByText('Architectures')).toBeInTheDocument();
        expect(screen.queryByTestId('search-group-icon-architectures')).not.toBeInTheDocument();
    });
});
