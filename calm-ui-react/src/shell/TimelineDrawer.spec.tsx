import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TimelineDrawer } from './TimelineDrawer.js';

describe('TimelineDrawer', () => {
    it('hides its children when collapsed by default', () => {
        render(
            <TimelineDrawer>
                <div data-testid="drawer-body">body</div>
            </TimelineDrawer>,
        );
        expect(screen.queryByTestId('drawer-body')).not.toBeInTheDocument();
    });

    it('shows children after the toggle is clicked', () => {
        render(
            <TimelineDrawer>
                <div data-testid="drawer-body">body</div>
            </TimelineDrawer>,
        );
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
    });

    it('honours defaultCollapsed=false', () => {
        render(
            <TimelineDrawer defaultCollapsed={false}>
                <div data-testid="drawer-body">body</div>
            </TimelineDrawer>,
        );
        expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
    });

    it('uses the supplied label', () => {
        render(
            <TimelineDrawer label="History">
                <div>x</div>
            </TimelineDrawer>,
        );
        expect(screen.getByText('History')).toBeInTheDocument();
    });
});
