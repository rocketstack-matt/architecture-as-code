import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DecoratorsPanel } from './DecoratorsPanel.js';
import type { Decorator } from '../../../../visualizer/contracts/contracts.js';

const decorator = (uniqueId: string, type: string): Decorator => ({
    uniqueId,
    type,
    target: ['/api/calm/namespaces/finos/architectures/1/versions/1-0-0'],
    appliesTo: ['node-a'],
    data: { note: `${uniqueId} data` },
});

const decorators = [decorator('dep-1', 'deployment'), decorator('obs-1', 'observability'), decorator('dep-2', 'deployment')];
const loaded = { status: 'loaded' as const, decorators };

describe('DecoratorsPanel', () => {
    it('lists the decorators of every type when there is no filter', () => {
        render(<DecoratorsPanel state={loaded} typeFilter={null} onTypeFilterChange={vi.fn()} />);
        expect(screen.getAllByRole('article')).toHaveLength(3);
    });

    it('offers each type with its count, sorted, after "All types"', () => {
        render(<DecoratorsPanel state={loaded} typeFilter={null} onTypeFilterChange={vi.fn()} />);
        const options = screen.getAllByRole('option').map((option) => option.textContent);
        expect(options).toEqual(['All types (3)', 'deployment (2)', 'observability (1)']);
    });

    it('lists only the decorators of the filtered type', () => {
        render(<DecoratorsPanel state={loaded} typeFilter="deployment" onTypeFilterChange={vi.fn()} />);
        expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
            'deployment decorator dep-1',
            'deployment decorator dep-2',
        ]);
        expect(screen.getByRole('combobox')).toHaveValue('deployment');
    });

    it('reports a type change, and null for "All types"', async () => {
        const user = userEvent.setup();
        const onTypeFilterChange = vi.fn();
        const { rerender } = render(<DecoratorsPanel state={loaded} typeFilter={null} onTypeFilterChange={onTypeFilterChange} />);

        await user.selectOptions(screen.getByRole('combobox'), 'observability');
        expect(onTypeFilterChange).toHaveBeenLastCalledWith('observability');

        rerender(<DecoratorsPanel state={loaded} typeFilter="observability" onTypeFilterChange={onTypeFilterChange} />);
        await user.selectOptions(screen.getByRole('combobox'), '');
        expect(onTypeFilterChange).toHaveBeenLastCalledWith(null);
    });

    it('keeps a linked type that has no decorators selectable, and says none match', () => {
        render(<DecoratorsPanel state={loaded} typeFilter="validation" onTypeFilterChange={vi.fn()} />);
        expect(screen.getByRole('option', { name: 'validation (0)' })).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('validation');
        expect(screen.getByText('No decorators of type validation.')).toBeInTheDocument();
        expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    it('shows a loading state', () => {
        render(<DecoratorsPanel state={{ status: 'loading' }} typeFilter={null} onTypeFilterChange={vi.fn()} />);
        expect(screen.getByText('Loading decorators…')).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows an error state', () => {
        render(<DecoratorsPanel state={{ status: 'error' }} typeFilter={null} onTypeFilterChange={vi.fn()} />);
        expect(screen.getByText('Could not load decorators.')).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows an empty state with no filter', () => {
        render(<DecoratorsPanel state={{ status: 'loaded', decorators: [] }} typeFilter="deployment" onTypeFilterChange={vi.fn()} />);
        expect(screen.getByText('No decorators for this architecture version.')).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
});
