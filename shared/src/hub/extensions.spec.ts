import { describe, it, expect } from 'vitest';
import { buildExtensionRequest, extensionProxyPath, HubExtensionRoute } from './extensions';

const route = (method: string, path: string): HubExtensionRoute => ({ id: 'r', method, path, scope: 'read' });

describe('extensionProxyPath', () => {
    it('puts the route path under the proxy prefix of the extension', () => {
        expect(extensionProxyPath('example-services', '/search')).toBe('/api/calm/extensions/example-services/api/search');
    });

    it('encodes the extension id', () => {
        expect(extensionProxyPath('a/b', '/x')).toBe('/api/calm/extensions/a%2Fb/api/x');
    });
});

describe('buildExtensionRequest', () => {
    it('fills path parameters and sends the rest as the query for GET', () => {
        const request = buildExtensionRequest('ext', route('GET', '/namespaces/{namespace}/services'), {
            namespace: 'finos', limit: 10, tags: ['a', 'b'], filter: { kind: 'svc' }, skipped: undefined,
        });

        expect(request).toEqual({
            method: 'GET',
            path: '/api/calm/extensions/ext/api/namespaces/finos/services',
            query: [['limit', '10'], ['tags', 'a'], ['tags', 'b'], ['filter', '{"kind":"svc"}']],
        });
    });

    it('sends the rest as the query for DELETE', () => {
        const request = buildExtensionRequest('ext', route('delete', '/items/{id}'), { id: 7, force: true });

        expect(request).toEqual({ method: 'DELETE', path: '/api/calm/extensions/ext/api/items/7', query: [['force', 'true']] });
    });

    it('sends the rest as the JSON body for other methods', () => {
        const request = buildExtensionRequest('ext', route('POST', '/namespaces/{namespace}/services'), {
            namespace: 'finos', name: 'payments', tags: ['a'],
        });

        expect(request).toEqual({
            method: 'POST',
            path: '/api/calm/extensions/ext/api/namespaces/finos/services',
            query: [],
            body: { name: 'payments', tags: ['a'] },
        });
    });

    it('sends an empty body when every property fills the path', () => {
        const request = buildExtensionRequest('ext', route('PUT', '/items/{id}'), { id: 'x' });

        expect(request.body).toEqual({});
    });

    it('encodes path parameter values, so that a value cannot add path segments', () => {
        const request = buildExtensionRequest('ext', route('GET', '/namespaces/{namespace}'), { namespace: '../admin?x=1' });

        expect(request.path).toBe('/api/calm/extensions/ext/api/namespaces/..%2Fadmin%3Fx%3D1');
    });

    it.each(['.', '..'])('fails when a path parameter is the dot segment %s', (value) => {
        expect(() => buildExtensionRequest('ext', route('GET', '/namespaces/{namespace}'), { namespace: value }))
            .toThrow('Input property \'namespace\' must not be . or ..');
    });

    it('fills a parameter that the path uses twice', () => {
        const request = buildExtensionRequest('ext', route('GET', '/{ns}/copy/{ns}'), { ns: 'finos' });

        expect(request.path).toBe('/api/calm/extensions/ext/api/finos/copy/finos');
        expect(request.query).toEqual([]);
    });

    it('does not change the input object', () => {
        const input = { namespace: 'finos', name: 'payments' };
        buildExtensionRequest('ext', route('POST', '/namespaces/{namespace}'), input);

        expect(input).toEqual({ namespace: 'finos', name: 'payments' });
    });

    it('fails when a path parameter is missing', () => {
        expect(() => buildExtensionRequest('ext', route('GET', '/namespaces/{namespace}'), {}))
            .toThrow('Input property \'namespace\' must be a string, number or boolean, because it fills the path /namespaces/{namespace}');
    });

    it('fails when a path parameter is an object', () => {
        expect(() => buildExtensionRequest('ext', route('GET', '/namespaces/{namespace}'), { namespace: { a: 1 } }))
            .toThrow('Input property \'namespace\'');
    });
});
