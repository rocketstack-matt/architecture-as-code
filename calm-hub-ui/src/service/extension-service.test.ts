import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { ExtensionService } from './extension-service.js';

vi.mock('../authService.js', () => ({ getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test' }) }));

const ax = axios.create();
const mock = new AxiosMockAdapter(ax);
const service = new ExtensionService(ax);
afterEach(() => mock.reset());

it('keeps registry and contribution order, including views without routes', async () => {
    const first = { id: 'scanner', match: { type: 'scan' }, label: 'Scan' };
    const second = { id: 'audit', match: { schema: 'https://example.org/audit' }, label: 'Audit' };
    mock.onGet('/api/calm/extensions').reply(200, { values: [
        { contributes: { 'decorator-views': [first, second] } }, {},
        { contributes: { 'decorator-views': [second] } },
    ] });
    expect(await service.fetchDecoratorViews()).toEqual([first, second, second]);
    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer test');
});

it('returns no views for an empty response', async () => {
    mock.onGet('/api/calm/extensions').reply(200, {});
    expect(await service.fetchDecoratorViews()).toEqual([]);
});

it('rejects a failed registry request', async () => {
    mock.onGet('/api/calm/extensions').reply(503);
    await expect(service.fetchDecoratorViews()).rejects.toThrow('Error fetching decorator views:');
});

it('keeps registry outages out of the global error page', async () => {
    const { migrationStore } = await import('./utils/migration-store.js');
    const { authStore } = await import('./utils/auth-store.js');
    const create = vi.spyOn(axios, 'create').mockReturnValue(ax);
    mock.onGet('/api/calm/extensions').reply(503);
    await expect(new ExtensionService().fetchDecoratorViews()).rejects.toThrow();
    expect(migrationStore.getMigrationError()).toBeNull();
    expect(authStore.getAuthError()).toBeNull();
    create.mockRestore();
});
