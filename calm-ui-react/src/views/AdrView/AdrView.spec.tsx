import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdrView } from './AdrView.js';
import type { AdrDocument } from './types.js';

const adr: AdrDocument = {
    title: 'Use Postgres for the trade store',
    status: 'accepted',
    contextAndProblemStatement: 'We need a relational store with strong consistency.',
    decisionDrivers: ['ACID semantics', 'Operational familiarity'],
    consideredOptions: [
        {
            name: 'Postgres',
            description: 'Open source RDBMS',
            positiveConsequences: ['ACID', 'Rich ecosystem'],
            negativeConsequences: ['Operational overhead'],
        },
        { name: 'DynamoDB', description: 'Managed key-value' },
    ],
    decisionOutcome: {
        chosenOption: { name: 'Postgres', description: 'Open source RDBMS' },
        rationale: 'Best fit for the consistency requirements.',
    },
    links: [{ rel: 'supersedes', href: 'adr/0001.md', text: 'Original choice' }],
    creationDateTime: '2024-01-15T10:00:00Z',
    updateDateTime: '2024-02-01T12:30:00Z',
};

describe('AdrView', () => {
    it('renders the title and status badge', () => {
        render(<AdrView adr={adr} />);
        expect(screen.getByText('Use Postgres for the trade store')).toBeInTheDocument();
        expect(screen.getByText('accepted')).toBeInTheDocument();
    });

    it('renders the considered options', () => {
        render(<AdrView adr={adr} />);
        // The chosen option name appears twice (once in considered, once in outcome).
        expect(screen.getAllByText('Postgres').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('DynamoDB')).toBeInTheDocument();
    });

    it('renders pros and cons for an option with consequences', () => {
        render(<AdrView adr={adr} />);
        expect(screen.getByText('Pros')).toBeInTheDocument();
        expect(screen.getByText('ACID')).toBeInTheDocument();
        expect(screen.getByText('Cons')).toBeInTheDocument();
        expect(screen.getByText('Operational overhead')).toBeInTheDocument();
    });

    it('renders the link with the supplied text', () => {
        render(<AdrView adr={adr} />);
        const link = screen.getByRole('link', { name: /Original choice/i });
        expect(link).toHaveAttribute('href', 'adr/0001.md');
    });

    it('accepts the envelope shape ({ adr: ... }) too', () => {
        render(<AdrView adr={{ adr }} />);
        expect(screen.getByText('Use Postgres for the trade store')).toBeInTheDocument();
    });

    it('renders gracefully when sections are missing', () => {
        render(<AdrView adr={{ title: 'Bare ADR' }} />);
        expect(screen.getByText('Bare ADR')).toBeInTheDocument();
        // No section headers when their data is absent.
        expect(screen.queryByText('Context and problem')).not.toBeInTheDocument();
        expect(screen.queryByText('Decision drivers')).not.toBeInTheDocument();
    });
});
