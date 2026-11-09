import { describe, expect, it } from 'vitest';
import { actionContributions, resourceExtensions, screenPath } from './contributions.js';
import { fakeExtension } from '../test-support/fake-extensions.js';

describe('extension contributions', () => {
    it('shows an action only when the context gives its path parameters', () => {
        const extension = fakeExtension(1);
        const scoped = { ...extension, routes: extension.routes.map((r) => (r.id === 'run' ? { ...r, path: '/run/{namespace}/{selectedElement}' } : r)) };
        expect(actionContributions(scoped, {})).toEqual([]);
        expect(actionContributions(scoped, { namespace: 'ns', selectedElement: 'node' })).toHaveLength(1);
        expect(actionContributions(scoped, { namespace: 'ns', selectedElement: 'a/b' })).toEqual([]);
    });

    it('drops an action whose route is missing', () => {
        const extension = { ...fakeExtension(1), routes: [] };
        expect(actionContributions(extension, {})).toEqual([]);
    });

    it('lists the extensions with an action or a designer tab for the resource', () => {
        const entries = resourceExtensions(
            [fakeExtension(1, ['designer-tab']), fakeExtension(2, ['action']), fakeExtension(3, ['screen', 'detail-panel'])],
            { namespace: 'ns' }
        );
        expect(entries.map(({ extension, actions, tabs }) => [extension.id, actions.length, tabs.length])).toEqual([
            ['ext-1', 0, 1],
            ['ext-2', 1, 0],
        ]);
    });

    it('hides a designer tab whose path needs a parameter that no context gives', () => {
        const extension = fakeExtension(1, ['designer-tab']);
        const unfillable = { ...extension, routes: extension.routes.map((r) => (r.id === 'data' ? { ...r, path: '/data/{resource}' } : r)) };
        expect(resourceExtensions([unfillable], { namespace: 'ns' })).toEqual([]);
    });

    it('hides an action when a context value has a control character', () => {
        const extension = fakeExtension(1, ['action']);
        expect(actionContributions(extension, { namespace: 'ns\n' })).toEqual([]);
        expect(actionContributions(extension, { namespace: 'ns\u007f' })).toEqual([]);
    });

    it('builds an encoded screen path', () => {
        const extension = { ...fakeExtension(1), id: 'a b' };
        expect(screenPath(extension, { id: 'x/y', title: 'X', route: 'data' })).toBe('/extensions/a%20b/x%2Fy');
    });
});
