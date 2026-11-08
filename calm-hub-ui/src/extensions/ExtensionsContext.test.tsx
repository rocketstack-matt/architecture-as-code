import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionsProvider, useExtensions, useExtensionsStatus } from './ExtensionsContext.js';
import { ExtensionService, extensionService } from '../service/extension-service.js';
vi.mock('../authService.js', () => ({ getAuthHeaders: vi.fn().mockResolvedValue({}) }));
function Consumer() {
    return (
        <div>
            <span data-testid="status">{useExtensionsStatus()}</span>
            {useExtensions()
                .map((item) => item.name)
                .join(',') || 'empty'}
        </div>
    );
}
afterEach(() => vi.restoreAllMocks());
describe('ExtensionsProvider', () => {
    it('loads once even when StrictMode replays effects and skips unsupported contracts', async () => {
        const service = new ExtensionService();
        const fetch = vi.spyOn(service, 'fetchExtensions').mockResolvedValue([
            { id: 'test', name: 'Test', hubApi: 0, routes: [], contributes: {} },
            { id: 'future', name: 'Future', hubApi: 1, routes: [], contributes: {} },
        ]);
        render(
            <StrictMode>
                <ExtensionsProvider service={service}>
                    <Consumer />
                </ExtensionsProvider>
            </StrictMode>
        );
        expect(await screen.findByText('Test')).toBeInTheDocument();
        expect(screen.getByTestId('status')).toHaveTextContent('loaded');
        expect(fetch).toHaveBeenCalledOnce();
        expect(screen.queryByText('Future')).not.toBeInTheDocument();
    });
    it('keeps the UI unchanged on a registry error', async () => {
        const service = new ExtensionService();
        vi.spyOn(service, 'fetchExtensions').mockRejectedValue(new Error());
        render(
            <ExtensionsProvider service={service}>
                <Consumer />
            </ExtensionsProvider>
        );
        expect(await screen.findByText('empty')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
    });
    it('is loading until the registry settles', () => {
        const service = new ExtensionService();
        vi.spyOn(service, 'fetchExtensions').mockReturnValue(new Promise(() => {}));
        render(
            <ExtensionsProvider service={service}>
                <Consumer />
            </ExtensionsProvider>
        );
        expect(screen.getByTestId('status')).toHaveTextContent('loading');
    });
    it('sends one registry request with the default service', async () => {
        const mock = new AxiosMockAdapter((extensionService as unknown as { ax: AxiosInstance }).ax as never);
        mock.onGet('/api/calm/extensions').reply(200, { values: [{ id: 'default', name: 'Default', hubApi: 0, routes: [], contributes: {} }] });
        render(
            <StrictMode>
                <ExtensionsProvider>
                    <Consumer />
                </ExtensionsProvider>
            </StrictMode>
        );
        expect(await screen.findByText('Default')).toBeInTheDocument();
        expect(mock.history.get.filter((request) => request.url === '/api/calm/extensions')).toHaveLength(1);
        mock.restore();
    });
});
