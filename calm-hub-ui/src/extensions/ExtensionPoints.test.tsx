import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionsContext } from '../components/extensions/ExtensionsContext.js';
import { ExtensionPoints, ExtensionScreenLinks } from './ExtensionPoints.js';
import { ExtensionScreenPage } from './ExtensionScreenPage.js';
import { extensionTabs } from './extension-tabs.js';
import { ExtensionSummary } from '../model/extensions.js';
import { ExtensionService } from '../service/extension-service.js';
vi.mock('../components/navbar/Navbar.js', () => ({ Navbar: () => <nav>Navbar</nav> }));
const extension: ExtensionSummary = {
    id: 'test',
    name: 'Test',
    hubApi: 0,
    routes: [{ id: 'data', path: '/data', method: 'GET', scope: 'authenticated', readOnly: true }],
    contributes: Object.fromEntries(
        ['screen', 'landing-card', 'designer-tab', 'detail-panel', 'action'].map((key) => [
            key,
            [{ id: 'summary', title: 'Summary', route: 'data' }],
        ])
    ),
};
afterEach(() => vi.restoreAllMocks());
describe('extension points', () => {
    it('renders nothing without extensions', () => {
        const { container } = render(
            <MemoryRouter>
                <ExtensionScreenLinks />
                <ExtensionPoints point="landing-card" />
            </MemoryRouter>
        );
        expect(container).toBeEmptyDOMElement();
        expect(extensionTabs([])).toEqual([]);
    });
    it('links to a screen route', () => {
        render(
            <MemoryRouter>
                <ExtensionsContext.Provider value={[extension]}>
                    <ExtensionScreenLinks />
                </ExtensionsContext.Provider>
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: 'Summary' })).toHaveAttribute('href', '/extensions/test/summary');
    });
    it.each(['landing-card', 'detail-panel'] as const)('loads a %s slot with context', async (point) => {
        const call = vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
        render(
            <ExtensionsContext.Provider value={[extension]}>
                <ExtensionPoints point={point} context={{ namespace: 'test', selectedElement: 'node' }} />
            </ExtensionsContext.Provider>
        );
        expect(await screen.findByRole('heading', { name: 'Summary' })).toBeInTheDocument();
        expect(call.mock.calls[0][2]).toMatchObject({ namespace: 'test', selectedElement: 'node' });
    });
    it('registers a designer tab with a stable namespaced id', () => {
        expect(extensionTabs([extension])[0]).toMatchObject({ id: 'extension:test:summary', label: 'Summary' });
    });
    it('loads a screen from route parameters', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
        render(
            <MemoryRouter initialEntries={['/extensions/test/summary']}>
                <ExtensionsContext.Provider value={[extension]}>
                    <Routes>
                        <Route path="/extensions/:extensionId/:contributionId" element={<ExtensionScreenPage />} />
                    </Routes>
                </ExtensionsContext.Provider>
            </MemoryRouter>
        );
        expect(await screen.findByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    });
});
