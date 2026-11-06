import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionService, extensionRequest } from './extension-service.js';
import { ExtensionRoute } from '../model/extensions.js';
import { migrationStore } from './utils/migration-store.js';
import { authStore } from './utils/auth-store.js';
import { apiClient } from './utils/api-client.js';
vi.mock('../authService.js', () => ({ getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'test' }) }));
const ax = axios.create();
vi.spyOn(axios, 'create').mockReturnValue(ax);
const mock = new AxiosMockAdapter(ax as never);
const route: ExtensionRoute = { id: 'summary', method: 'GET', path: '/summary/{namespace}', scope: 'read', readOnly: true };
afterEach(() => mock.reset());

describe('ExtensionService', () => {
    it('loads the registry', async () => {
        mock.onGet('/api/calm/extensions').reply(200, { values: [{ id: 'test' }] });
        expect(await new ExtensionService(ax).fetchExtensions()).toEqual([{ id: 'test' }]);
    });
    it('treats an absent registry values list as empty', async () => {
        mock.onGet('/api/calm/extensions').reply(200, {});
        const service = new ExtensionService(ax);
        expect(await service.fetchExtensions()).toEqual([]);
        expect(await service.fetchDecoratorViews()).toEqual([]);
    });
    it('rejects registry failures', async () => {
        mock.onGet('/api/calm/extensions').reply(500);
        await expect(new ExtensionService(ax).fetchExtensions()).rejects.toThrow('Error fetching extensions');
    });
    it('keeps registry and contribution order, including views without routes', async () => {
        const first = { id: 'scanner', match: { type: 'scan' }, label: 'Scan' };
        const second = { id: 'audit', match: { schema: 'https://example.org/audit' }, label: 'Audit' };
        mock.onGet('/api/calm/extensions').reply(200, { values: [
            { contributes: { 'decorator-views': [first, second] } }, {},
            { contributes: { 'decorator-views': [second] } },
        ] });
        expect(await new ExtensionService(ax).fetchDecoratorViews()).toEqual([first, second, second]);
        expect(mock.history.get[0].headers?.Authorization).toBe('test');
    });
    it('tags each decorator view with its extension, and marks built-in ones', async () => {
        const view = { id: 'risk', match: { type: 'risk' }, label: 'Risk' };
        mock.onGet('/api/calm/extensions').reply(200, { values: [
            { id: 'release-tracker', name: 'Release tracker', contributes: { 'decorator-views': [view] } },
            { id: 'deployment', name: 'Deployments', contributes: { 'decorator-views': [view] } },
            { id: 'nameless', contributes: { 'decorator-views': [view] } },
        ] });
        expect((await new ExtensionService(ax).fetchDecoratorViews()).map((v) => v.source)).toEqual([
            { id: 'release-tracker', name: 'Release tracker', builtIn: false },
            { id: 'deployment', name: 'Deployments', builtIn: true },
            { id: 'nameless', name: 'nameless', builtIn: false },
        ]);
        expect(mock.history.get[0].headers?.Authorization).toBe('test');
    });
    it('rejects a failed decorator view request', async () => {
        mock.onGet('/api/calm/extensions').reply(503);
        await expect(new ExtensionService(ax).fetchDecoratorViews()).rejects.toThrow('Error fetching decorator views:');
    });
    it('shares one registry request between extensions and decorator views', async () => {
        mock.onGet('/api/calm/extensions').reply(200, { values: [{ id: 'test' }] });
        const service = new ExtensionService(ax);
        await Promise.all([service.fetchExtensions(), service.fetchDecoratorViews(), service.fetchExtensions()]);
        expect(mock.history.get).toHaveLength(1);
    });
    it('retries the registry after a failure', async () => {
        mock.onGet('/api/calm/extensions').replyOnce(500).onGet('/api/calm/extensions').reply(200, { values: [{ id: 'test' }] });
        const service = new ExtensionService(ax);
        await expect(service.fetchExtensions()).rejects.toThrow();
        expect(await service.fetchExtensions()).toEqual([{ id: 'test' }]);
    });
    it('sends context through the proxy with auth', async () => {
        mock.onGet('/api/calm/extensions/test/api/summary/a%2Fb').reply((config) => {
            expect(config.params).toEqual({ namespace: 'a/b', resource: 'architectures/1', version: '1', selectedElement: 'node' });
            expect(config.headers?.Authorization).toBe('test');
            return [200, { hubApi: 0, blocks: [] }];
        });
        expect(
            await new ExtensionService(ax).call('test', route, { namespace: 'a/b', resource: 'architectures/1', version: '1', selectedElement: 'node' })
        ).toEqual({ hubApi: 0, blocks: [] });
    });
    it('sends write context in the body', async () => {
        mock.onPost('/api/calm/extensions/test/api/summary/ns').reply((config) => {
            expect(JSON.parse(config.data)).toEqual({ namespace: 'ns' });
            return [204];
        });
        await new ExtensionService(ax).call('test', { ...route, method: 'POST', readOnly: false }, { namespace: 'ns' });
    });
    it('rejects proxy failures', async () => {
        mock.onGet().reply(502);
        await expect(new ExtensionService(ax).call('test', route, { namespace: 'ns' })).rejects.toThrow();
    });
    it('keeps registry and proxy failures out of the global error pages', async () => {
        const shared = new AxiosMockAdapter(apiClient as never);
        shared.onAny().reply(401);
        mock.onGet('/api/calm/extensions').reply(401);
        mock.onGet().reply(503);
        const service = new ExtensionService();
        await expect(service.fetchDecoratorViews()).rejects.toThrow();
        await expect(service.fetchExtensions()).rejects.toThrow();
        await expect(service.call('test', route, { namespace: 'ns' })).rejects.toThrow();
        shared.restore();
        expect(migrationStore.getMigrationError()).toBeNull();
        expect(authStore.getAuthError()).toBeNull();
    });
    it('rejects missing route context', () => {
        expect(() => extensionRequest('test', route, {})).toThrow('Missing extension context');
    });
    it('rejects traversal paths', () => {
        expect(() => extensionRequest('test', { ...route, path: '/../x' }, {})).toThrow('Invalid extension route');
    });
});
