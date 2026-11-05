import { describe, it, expect } from 'vitest';
import {
    containersOfContainment,
    matchesView,
    overlayByElement,
    overlayStatus,
    statusText,
    worstStatus,
} from './overlayEngine.js';
import { BUILTIN_DECORATOR_VIEWS } from '../../test-support/decorator-views.js';
import type { Decorator, OverlayDecoratorView } from '../contracts/contracts.js';

const viewById = (id: string) => BUILTIN_DECORATOR_VIEWS.find((v) => v.id === id) as OverlayDecoratorView;
const evaluationView = viewById('control-evaluation');
const deploymentView = viewById('deployment');

const d = (id: string, control: string, status: string, at: string, appliesTo: string[], extra = {}): Decorator => ({
    schema: 'https://calm.finos.org/standards/control-evaluation/1.0/control-evaluation.decorator.standard.json',
    uniqueId: id,
    type: 'control-evaluation',
    target: ['/api/calm/namespaces/ns/architectures/1/versions/1-0-0'],
    appliesTo,
    data: { control: { 'unique-id': control, 'requirement-url': 'https://example.org/r' }, status, 'evaluated-at': at, ...extra },
});

const evaluations = (decorators: Decorator[], drawnAs?: Map<string, string>) => overlayByElement(evaluationView, decorators, drawnAs);
const ids = (overlay?: { entries: { decorator: Decorator }[] }) => overlay?.entries.map((e) => e.decorator.uniqueId);

describe('overlayByElement with the control-evaluation view', () => {
    it('keeps the newest evaluation per control and element', () => {
        const map = evaluations([
            d('a', 'code-review', 'not-met', '2026-11-04T15:00:00.000Z', ['trade-api']),
            d('b', 'code-review', 'met', '2026-11-04T15:01:00.000Z', ['trade-api']),
        ]);
        expect(map.get('trade-api')?.status).toBe('ok');
        expect(map.get('trade-api')?.value).toBe('met');
        expect(ids(map.get('trade-api'))).toEqual(['b']);
    });

    it('shows the worst status first, then orders by key', () => {
        const map = evaluations([
            d('a', 'code-review', 'met', '2026-11-04T15:00:00.000Z', ['trade-api']),
            d('b', 'client-ledger', 'not-met', '2026-11-04T15:00:00.000Z', ['trade-api', 'trade-api-to-client-ledger']),
            d('c', 'audit', 'met', '2026-11-04T15:00:00.000Z', ['trade-api']),
        ]);
        expect(map.get('trade-api')?.status).toBe('error');
        expect(map.get('trade-api')?.value).toBe('not-met');
        expect(map.get('trade-api-to-client-ledger')?.status).toBe('error');
        expect(ids(map.get('trade-api'))).toEqual(['b', 'c', 'a']);
        expect(map.get('trade-api')?.entries[0].label).toBe('client-ledger');
    });

    it('shows nothing for an element whose newest evaluations are all hidden', () => {
        const map = evaluations([
            d('a', 'client-ledger', 'not-met', '2026-11-04T15:00:00.000Z', ['client-ledger']),
            d('b', 'client-ledger', 'not-applicable', '2026-11-04T15:05:00.000Z', ['client-ledger']),
        ]);
        expect(map.has('client-ledger')).toBe(false);
    });

    it('skips decorators without a key or a time', () => {
        const noKey = { ...d('x', 'c', 'not-met', '2026-11-04T15:00:00.000Z', ['n']), data: { status: 'not-met', 'evaluated-at': '2026-11-04T15:00:00.000Z' } };
        const noTime = { ...d('y', 'c', 'not-met', '', ['m']), data: { control: { 'unique-id': 'c' }, status: 'not-met' } };
        const map = evaluations([noKey, noTime, d('a', 'c', 'met', '2026-11-04T15:00:00.000Z', ['services/x.ts'])]);
        expect(map.has('n')).toBe(false);
        expect(map.has('m')).toBe(false);
        expect(map.get('services/x.ts')?.status).toBe('ok');
    });

    it('never draws an unmapped or missing status when the view has no default', () => {
        const missing = { ...d('m', 'c', 'met', '2026-11-04T15:00:00.000Z', ['p']), data: { control: { 'unique-id': 'c' }, 'evaluated-at': '2026-11-04T15:00:00.000Z' } };
        const map = evaluations([d('x', 'c', 'bogus', '2026-11-04T15:00:00.000Z', ['n']), missing]);
        expect(map.size).toBe(0);
    });

    it('skips an unknown status before choosing the newest, so an older result remains', () => {
        const map = evaluations([
            d('a', 'c', 'met', '2026-11-04T15:00:00.000Z', ['n']),
            d('z', 'c', 'bogus', '2026-11-04T16:00:00.000Z', ['n']),
        ]);
        expect(ids(map.get('n'))).toEqual(['a']);
    });

    it('compares times as parsed times, and skips times that do not parse', () => {
        const map = evaluations([
            d('frac', 'c', 'not-met', '2026-11-04T15:00:00.500Z', ['n']),
            d('whole', 'c', 'met', '2026-11-04T15:00:00Z', ['n']),
            d('bad', 'c', 'met', 'not-a-time', ['n']),
            d('x', 'c', 'met', 'yesterday', ['only-bad']),
        ]);
        expect(ids(map.get('n'))).toEqual(['frac']);
        expect(map.has('only-bad')).toBe(false);
    });

    it('breaks a tie on time by the greater uniqueId, whatever the input order', () => {
        const a = d('a', 'c', 'not-met', '2026-11-04T15:00:00Z', ['n']);
        const b = d('b', 'c', 'met', '2026-11-04T15:00:00.000Z', ['n']);
        expect(ids(evaluations([a, b]).get('n'))).toEqual(['b']);
        expect(ids(evaluations([b, a]).get('n'))).toEqual(['b']);
    });

    it('ignores decorators the view does not match', () => {
        const other = { ...d('a', 'c', 'not-met', '2026-11-04T15:00:00Z', ['n']), type: 'deployment' };
        expect(evaluations([other]).size).toBe(0);
    });
});

describe('overlayByElement with the deployment view', () => {
    const deployment = (id: string, status: string, start: string, appliesTo: string[]): Decorator => ({
        uniqueId: id,
        type: 'deployment',
        target: [],
        appliesTo,
        data: { status, 'start-time': start },
    });

    it('draws the newest deployment of each element', () => {
        const map = overlayByElement(deploymentView, [
            deployment('d1', 'failed', '2026-11-04T10:00:00Z', ['api']),
            deployment('d2', 'completed', '2026-11-04T11:00:00Z', ['api', 'db']),
            deployment('d3', 'rolled-back', '2026-11-04T12:00:00Z', ['db']),
        ]);
        expect(map.get('api')).toMatchObject({ status: 'ok', value: 'completed' });
        expect(map.get('db')).toMatchObject({ status: 'warn', value: 'rolled-back' });
    });

    it('maps a status the Standard does not name to the default', () => {
        const map = overlayByElement(deploymentView, [deployment('d1', 'queued', '2026-11-04T10:00:00Z', ['api'])]);
        expect(map.get('api')).toMatchObject({ status: 'info', value: 'queued' });
    });
});

describe('overlayByElement with no time', () => {
    const view: OverlayDecoratorView = {
        id: 'scan',
        match: { schema: 'https://example.org/scan.json' },
        label: 'Scans',
        overlay: { status: '/result', map: { clean: 'ok', vulnerable: 'error', bad: 'nope' as never }, default: 'warn' },
    };
    const scan = (id: string, result: string, schema = 'https://example.org/scan.json'): Decorator =>
        ({ uniqueId: id, type: 'scan', schema, target: [], appliesTo: ['api'], data: { result } });

    it('counts every decorator, matches on $schema, and treats a map value off the scale as unmapped', () => {
        const map = overlayByElement(view, [scan('a', 'clean'), scan('b', 'vulnerable'), scan('c', 'clean', 'https://other')]);
        expect(map.get('api')?.status).toBe('error');
        expect(ids(map.get('api'))).toEqual(['b', 'a']);
        expect(overlayStatus(view.overlay, scan('x', 'bad'))).toBeUndefined();
    });
});

describe('containment relationships', () => {
    const relationships = [
        { 'unique-id': 'api-in-cluster', 'relationship-type': { 'deployed-in': { container: 'cluster', nodes: ['trade-api'] } } },
        { 'unique-id': 'system-has-ledger', 'relationship-type': { 'composed-of': { container: 'trade-system', nodes: ['client-ledger'] } } },
        { 'unique-id': 'api-to-ledger', 'relationship-type': { connects: { source: { node: 'trade-api' }, destination: { node: 'client-ledger' } } } },
    ];

    it('maps each deployed-in and composed-of relationship to its container, and nothing else', () => {
        expect([...containersOfContainment(relationships)]).toEqual([
            ['api-in-cluster', 'cluster'],
            ['system-has-ledger', 'trade-system'],
        ]);
        expect(containersOfContainment(undefined).size).toBe(0);
    });

    it('counts a containment relationship for its container, which draws it', () => {
        const map = evaluations(
            [d('a', 'residency', 'not-met', '2026-11-04T15:00:00.000Z', ['api-in-cluster'])],
            containersOfContainment(relationships),
        );
        expect(map.get('cluster')?.status).toBe('error');
        expect(map.has('api-in-cluster')).toBe(false);
    });

    it('keeps a worse result on one relationship when another in the container is better later', () => {
        const map = evaluations(
            [
                d('a', 'residency', 'not-met', '2026-11-04T15:00:00.000Z', ['api-in-cluster']),
                d('b', 'residency', 'met', '2026-11-04T15:01:00.000Z', ['db-in-cluster']),
            ],
            new Map([['api-in-cluster', 'cluster'], ['db-in-cluster', 'cluster']]),
        );
        expect(map.get('cluster')?.status).toBe('error');
        expect(ids(map.get('cluster'))).toEqual(['a', 'b']);
    });

    it('keeps a worse result on a relationship when the container itself is better later', () => {
        const map = evaluations(
            [
                d('a', 'residency', 'not-met', '2026-11-04T15:00:00.000Z', ['api-in-cluster']),
                d('b', 'residency', 'met', '2026-11-04T15:01:00.000Z', ['cluster']),
            ],
            containersOfContainment(relationships),
        );
        expect(map.get('cluster')?.status).toBe('error');
    });

    it('lets a newer result on the same relationship replace its older one', () => {
        const map = evaluations(
            [
                d('a', 'residency', 'not-met', '2026-11-04T15:00:00.000Z', ['api-in-cluster']),
                d('b', 'residency', 'met', '2026-11-04T15:01:00.000Z', ['api-in-cluster']),
            ],
            containersOfContainment(relationships),
        );
        expect(ids(map.get('cluster'))).toEqual(['b']);
    });

    it('counts one decorator once when it names both the container and its relationship', () => {
        const map = evaluations(
            [d('a', 'residency', 'not-met', '2026-11-04T15:00:00.000Z', ['cluster', 'api-in-cluster', 'trade-api'])],
            containersOfContainment(relationships),
        );
        expect(ids(map.get('cluster'))).toEqual(['a']);
        expect(map.get('trade-api')?.status).toBe('error');
    });
});

describe('helpers', () => {
    it('matches on type, on schema, on both, and never on an empty match', () => {
        const dec = { uniqueId: 'a', type: 't', schema: 's', target: [], appliesTo: [], data: {} };
        expect(matchesView({ id: 'v', label: 'V', match: { type: 't' } }, dec)).toBe(true);
        expect(matchesView({ id: 'v', label: 'V', match: { schema: 's' } }, dec)).toBe(true);
        expect(matchesView({ id: 'v', label: 'V', match: { type: 't', schema: 'x' } }, dec)).toBe(false);
        expect(matchesView({ id: 'v', label: 'V', match: {} }, dec)).toBe(false);
    });

    it('writes a status value as text', () => {
        expect(statusText('not-met')).toBe('Not met');
        expect(statusText('met')).toBe('Met');
        expect(statusText('rolled_back')).toBe('Rolled back');
    });

    it('finds the worst status', () => {
        expect(worstStatus(['ok', 'info', 'warn'])).toBe('warn');
        expect(worstStatus(['ok', 'error'])).toBe('error');
        expect(worstStatus([])).toBeUndefined();
    });
});
