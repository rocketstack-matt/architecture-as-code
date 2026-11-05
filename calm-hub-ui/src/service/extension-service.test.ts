import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionService, extensionRequest } from './extension-service.js';
import { ExtensionRoute } from '../model/extensions.js';
vi.mock('../authService.js', () => ({ getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'test' }) }));
const ax = axios.create();
const mock = new AxiosMockAdapter(ax as never);
const service = new ExtensionService(ax);
const route: ExtensionRoute = { id: 'summary', method: 'GET', path: '/summary/{namespace}', scope: 'read', readOnly: true };
afterEach(() => mock.reset());

describe('ExtensionService', () => {
    it('loads the registry', async () => {
        mock.onGet('/api/calm/extensions').reply(200, { values: [{ id: 'test' }] });
        expect(await service.fetchExtensions()).toEqual([{ id: 'test' }]);
    });
    it('treats an absent registry values list as empty', async () => {
        mock.onGet('/api/calm/extensions').reply(200, {});
        expect(await service.fetchExtensions()).toEqual([]);
    });
    it('rejects registry failures', async () => {
        mock.onGet('/api/calm/extensions').reply(500);
        await expect(service.fetchExtensions()).rejects.toThrow();
    });
    it('sends context through the proxy with auth', async () => {
        mock.onGet('/api/calm/extensions/test/api/summary/a%2Fb').reply((config) => {
            expect(config.params).toEqual({ namespace: 'a/b', resource: 'architectures/1', version: '1', selectedElement: 'node' });
            expect(config.headers?.Authorization).toBe('test');
            return [200, { hubApi: 0, blocks: [] }];
        });
        expect(
            await service.call('test', route, { namespace: 'a/b', resource: 'architectures/1', version: '1', selectedElement: 'node' })
        ).toEqual({ hubApi: 0, blocks: [] });
    });
    it('sends write context in the body', async () => {
        mock.onPost('/api/calm/extensions/test/api/summary/ns').reply((config) => {
            expect(JSON.parse(config.data)).toEqual({ namespace: 'ns' });
            return [204];
        });
        await service.call('test', { ...route, method: 'POST', readOnly: false }, { namespace: 'ns' });
    });
    it('rejects proxy failures', async () => {
        mock.onGet().reply(502);
        await expect(service.call('test', route, { namespace: 'ns' })).rejects.toThrow();
    });
    it('rejects missing route context', () => {
        expect(() => extensionRequest('test', route, {})).toThrow('Missing extension context');
    });
    it('rejects traversal paths', () => {
        expect(() => extensionRequest('test', { ...route, path: '/../x' }, {})).toThrow('Invalid extension route');
    });
});
