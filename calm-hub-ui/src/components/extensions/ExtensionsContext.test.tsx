import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionsProvider, useExtensions } from './ExtensionsContext.js';
import { ExtensionService } from '../../service/extension-service.js';
function Consumer() {
    return (
        <div>
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
    });
});
