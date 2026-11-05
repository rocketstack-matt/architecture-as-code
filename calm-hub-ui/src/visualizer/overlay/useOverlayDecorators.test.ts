import { describe, it, expect } from 'vitest';
import { overlayRequestTypes } from './useOverlayDecorators.js';
import { BUILTIN_DECORATOR_VIEWS } from '../../test-support/decorator-views.js';
import type { DecoratorView } from '../contracts/contracts.js';

const overlay = { status: '/status', map: {} };

describe('overlayRequestTypes', () => {
    it('requests each overlay view\'s type once, in a stable order', () => {
        expect(overlayRequestTypes(BUILTIN_DECORATOR_VIEWS)).toEqual(['control-evaluation', 'deployment']);
        const twice: DecoratorView[] = [
            { id: 'b', label: 'B', match: { type: 'scan' }, overlay },
            { id: 'a', label: 'A', match: { type: 'scan' }, overlay },
        ];
        expect(overlayRequestTypes(twice)).toEqual(['scan']);
    });

    it('requests nothing for views without an overlay', () => {
        expect(overlayRequestTypes([{ id: 'a', label: 'A', match: { type: 'scan' } }])).toEqual([]);
        expect(overlayRequestTypes([])).toEqual([]);
    });

    it('makes one unfiltered request when a view matches on $schema only', () => {
        const views: DecoratorView[] = [
            { id: 'a', label: 'A', match: { type: 'scan' }, overlay },
            { id: 'b', label: 'B', match: { schema: 'https://example.org/s.json' }, overlay },
        ];
        expect(overlayRequestTypes(views)).toEqual(['']);
    });
});
