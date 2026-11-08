import { render, screen, within } from '@testing-library/react';
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DecoratorsPanel } from './DecoratorsPanel.js';
import { CalmService } from '../../../../service/calm-service.js';
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

const withSchema = (uniqueId: string, type: string, schema: string): Decorator => ({ ...decorator(uniqueId, type), schema });

describe('DecoratorsPanel', () => {
    describe('schema filter', () => {
        const scans = { status: 'loaded' as const, decorators: [...decorators, withSchema('scan-1', 'scan', 'https://example.org/scan.json')] };

        it('lists only the decorators with the filtered $schema, and counts the types among them', () => {
            render(<DecoratorsPanel state={scans} typeFilter={null} schemaFilter="https://example.org/scan.json" onTypeFilterChange={vi.fn()} />);
            expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual(['scan decorator scan-1']);
            expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All types (1)', 'scan (1)']);
            expect(within(screen.getByRole('group', { name: 'Schema filter' })).getByText('https://example.org/scan.json')).toBeInTheDocument();
        });

        it('applies the type and the $schema filter together', () => {
            render(<DecoratorsPanel state={scans} typeFilter="deployment" schemaFilter="https://example.org/scan.json" onTypeFilterChange={vi.fn()} />);
            expect(screen.queryByRole('article')).not.toBeInTheDocument();
            expect(screen.getByText('No decorators of type deployment.')).toBeInTheDocument();
        });

        it('says that no decorator has the $schema', () => {
            render(<DecoratorsPanel state={loaded} typeFilter={null} schemaFilter="https://example.org/none.json" onTypeFilterChange={vi.fn()} />);
            expect(screen.getByText('No decorators with schema https://example.org/none.json.')).toBeInTheDocument();
        });

        it('reports null when the $schema filter is cleared', async () => {
            const onSchemaFilterChange = vi.fn();
            render(
                <DecoratorsPanel
                    state={scans}
                    typeFilter={null}
                    schemaFilter="https://example.org/scan.json"
                    onTypeFilterChange={vi.fn()}
                    onSchemaFilterChange={onSchemaFilterChange}
                />
            );
            await userEvent.setup().click(screen.getByRole('button', { name: 'Show all schemas' }));
            expect(onSchemaFilterChange).toHaveBeenCalledWith(null);
        });

        it('shows no $schema filter when there is none', () => {
            render(<DecoratorsPanel state={scans} typeFilter={null} onTypeFilterChange={vi.fn()} />);
            expect(screen.queryByRole('button', { name: 'Show all schemas' })).not.toBeInTheDocument();
            expect(screen.getAllByRole('article')).toHaveLength(4);
        });
    });

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

    describe('a decorator with no type', () => {
        // The API does not require a type. The order matters: the sort used to throw only when the typed one came first.
        const untyped = { ...decorator('raw-1', 'unused'), type: undefined };
        const nullType = { ...decorator('raw-2', 'unused'), type: null as unknown as string };
        const mixed = { status: 'loaded' as const, decorators: [decorator('dep-1', 'deployment'), untyped, nullType] };

        it('groups it under "(no type)" in the filter', () => {
            render(<DecoratorsPanel state={mixed} typeFilter={null} onTypeFilterChange={vi.fn()} />);
            expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
                'All types (3)',
                '(no type) (2)',
                'deployment (1)',
            ]);
            expect(screen.getAllByRole('article')).toHaveLength(3);
        });

        it('filters to the decorators with no type', () => {
            render(<DecoratorsPanel state={mixed} typeFilter="(no type)" onTypeFilterChange={vi.fn()} />);
            expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
                '(no type) decorator raw-1',
                '(no type) decorator raw-2',
            ]);
        });
    });

    it('shows the Hub-owned times from a Hub reply', async () => {
        const ax = axios.create();
        const mock = new AxiosMockAdapter(ax as never);
        const target = '/api/calm/namespaces/finos/architectures/1/versions/1-0-0';
        mock.onGet(`/api/calm/namespaces/finos/decorators/values?target=${encodeURIComponent(target)}`).reply(200, {
            values: [
                {
                    ...decorator('dep-1', 'deployment'),
                    creationDateTime: '2026-11-01T09:00:00.000Z',
                    updateDateTime: '2026-11-02T10:30:00.000Z',
                },
                decorator('legacy-1', 'deployment'),
            ],
        });
        const reply = await new CalmService(ax).fetchDecoratorsForTarget('finos', target);

        render(<DecoratorsPanel state={{ status: 'loaded', decorators: reply }} typeFilter={null} onTypeFilterChange={vi.fn()} />);

        const timed = screen.getByRole('article', { name: 'deployment decorator dep-1' });
        expect(within(timed).getByText('Created')).toBeInTheDocument();
        expect(within(timed).getByText('Updated')).toBeInTheDocument();
        expect(within(timed).getAllByRole('time').map((time) => time.getAttribute('datetime'))).toEqual([
            '2026-11-01T09:00:00.000Z',
            '2026-11-02T10:30:00.000Z',
        ]);
        const legacy = screen.getByRole('article', { name: 'deployment decorator legacy-1' });
        expect(within(legacy).queryByText('Created')).not.toBeInTheDocument();
    });
});
