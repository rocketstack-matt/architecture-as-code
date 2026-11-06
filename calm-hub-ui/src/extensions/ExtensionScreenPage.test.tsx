import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ExtensionsContext } from '../components/extensions/ExtensionsContext.js';
import { ExtensionService } from '../service/extension-service.js';
import { ExtensionScreenPage } from './ExtensionScreenPage.js';
import { fakeExtension } from '../test-support/fake-extensions.js';

vi.mock('../components/navbar/Navbar.js', () => ({ Navbar: () => <nav>Navbar</nav> }));
afterEach(() => vi.restoreAllMocks());

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <ExtensionsContext.Provider value={[fakeExtension(1)]}>
                <Routes>
                    <Route path="/extensions/:extensionId/:contributionId" element={<ExtensionScreenPage />} />
                </Routes>
            </ExtensionsContext.Provider>
        </MemoryRouter>
    );

it('loads a screen from route parameters', async () => {
    vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
    renderAt('/extensions/ext-1/screen');
    expect(await screen.findByRole('heading', { name: 'screen 1' })).toBeInTheDocument();
});

it('says so for an unknown screen', () => {
    renderAt('/extensions/ext-1/nothing');
    expect(screen.getByText('Extension screen unavailable.')).toBeInTheDocument();
});
