import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Drawer } from './Drawer.js';

describe('Drawer', () => {
    it('should render Drawer', () => {
        render(
            <Drawer
                calmInstance={undefined}
                title={undefined}
                isConDescActive={true}
                isNodeDescActive={true}
            />
        );
        expect(screen.getByText('No file selected')).toBeInTheDocument();
    });

    it('should render Drawer', () => {
        render(
            <Drawer
                calmInstance={undefined}
                title={undefined}
                isConDescActive={false}
                isNodeDescActive={false}
            />
        );
        expect(screen.getByText('No file selected')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'drawer-toggle' })).not.toBeChecked();
    });
});
