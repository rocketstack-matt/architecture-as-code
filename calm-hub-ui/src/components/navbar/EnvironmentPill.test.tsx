import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnvironmentPill } from './EnvironmentPill.js';

describe('EnvironmentPill', () => {
    it.each(['info', 'success', 'warning', 'error', 'neutral'])('uses the DaisyUI badge class for the %s token', (colour) => {
        render(<EnvironmentPill environment={{ name: 'UAT', colour }} />);

        const pill = screen.getByTestId('environment-pill');
        expect(pill).toHaveClass(`badge-${colour}`);
        expect(pill).not.toHaveAttribute('style');
    });

    it('uses an inline style for a hex colour', () => {
        render(<EnvironmentPill environment={{ name: 'PROD', colour: '#b91c1c' }} />);

        expect(screen.getByTestId('environment-pill')).toHaveStyle({
            backgroundColor: '#b91c1c',
            color: '#ffffff',
        });
    });

    it('ignores a colour that is neither a token nor a hex colour', () => {
        render(<EnvironmentPill environment={{ name: 'DEV', colour: 'red; background: url(x)' }} />);

        const pill = screen.getByTestId('environment-pill');
        expect(pill).not.toHaveAttribute('style');
        expect(pill.className).not.toContain('red');
    });

    it('shows the full name as a tooltip, because a long name is truncated', () => {
        render(<EnvironmentPill environment={{ name: 'Pre-production EMEA', colour: 'info' }} />);

        expect(screen.getByTestId('environment-pill')).toHaveAttribute('title', 'Pre-production EMEA');
        expect(screen.getByText('Pre-production EMEA')).toBeInTheDocument();
    });
});

describe('EnvironmentPill full name', () => {
    const name = 'Pre-production EMEA';
    const renderPill = () => {
        render(
            <>
                <EnvironmentPill environment={{ name, colour: '#b91c1c' }} />
                <p>elsewhere</p>
            </>
        );
        return screen.getByRole('button', { name });
    };

    it('shows the full name on a tap, without hover, and hides it on a second tap', () => {
        const pill = renderPill();
        expect(pill).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('environment-pill-full-name')).not.toBeInTheDocument();

        fireEvent.click(pill);
        const fullName = screen.getByTestId('environment-pill-full-name');
        expect(fullName).toHaveTextContent(name);
        expect(fullName).toHaveStyle({ backgroundColor: '#b91c1c' });
        expect(pill).toHaveAttribute('aria-expanded', 'true');
        expect(pill).toHaveAttribute('aria-controls', fullName.id);

        fireEvent.click(pill);
        expect(screen.queryByTestId('environment-pill-full-name')).not.toBeInTheDocument();
    });

    it('hides the full name on a tap outside, and keeps it on a tap on the name', () => {
        const pill = renderPill();
        fireEvent.click(pill);
        fireEvent.pointerDown(screen.getByTestId('environment-pill-full-name'));
        expect(screen.getByTestId('environment-pill-full-name')).toBeInTheDocument();

        fireEvent.pointerDown(screen.getByText('elsewhere'));
        expect(screen.queryByTestId('environment-pill-full-name')).not.toBeInTheDocument();
    });

    it('hides the full name on Escape, and ignores other keys', () => {
        const pill = renderPill();
        fireEvent.click(pill);
        fireEvent.keyDown(pill, { key: 'a' });
        expect(screen.getByTestId('environment-pill-full-name')).toBeInTheDocument();

        fireEvent.keyDown(pill, { key: 'Escape' });
        expect(screen.queryByTestId('environment-pill-full-name')).not.toBeInTheDocument();
    });

    it('stops listening for taps outside once closed', () => {
        const remove = vi.spyOn(document, 'removeEventListener');
        const pill = renderPill();
        fireEvent.click(pill);
        fireEvent.click(pill);
        expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        remove.mockRestore();
    });
});
