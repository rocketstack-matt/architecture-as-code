// Run with: node --test calm-hub/local-dev/demo-extensions/stride-threats/routes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { route } from './routes.mjs';
import { buildDecorators, CATEGORIES, threatsFor } from './threats.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = read('./extension.json');
const blocksSchema = read('../../../src/main/resources/META-INF/calm-extensions/schema/0/blocks.schema.json');
const get = (path) => route('GET', new URL(path, 'http://localhost'), {});

const blockTypes = new Set(JSON.stringify(blocksSchema).match(/"const":"[a-zA-Z]+"/g).map((c) => c.slice(9, -1)));
const tones = ['positive', 'negative', 'warning', 'info', 'neutral'];
function assertBlocks(reply) {
    assert.equal(reply.hubApi, 0);
    for (const block of reply.blocks) {
        assert.ok(blockTypes.has(block.type), `unknown block type ${block.type}`);
        for (const tone of JSON.stringify(block).match(/"tone":"[^"]*"/g) ?? []) {
            assert.ok(tones.includes(tone.slice(8, -1)), tone);
        }
    }
}

test('every UI contribution names a GET route without a path parameter', () => {
    const routes = new Map(manifest.routes.map((r) => [r.id, r]));
    for (const kind of ['screen', 'designer-tab', 'landing-card', 'detail-panel']) {
        const [contribution] = manifest.contributes[kind];
        assert.equal(routes.get(contribution.route).method, 'GET', kind);
    }
    assert.ok(manifest.routes.every((r) => !r.path.includes('{')));
    assert.equal(routes.get(manifest.contributes.action[0].route).method, 'POST');
});

test('the screen, tab, card and panel return valid blocks', () => {
    for (const path of ['/screen', '/tab?namespace=demo&resource=architectures%2F1&version=1.0.0', '/card',
        '/element?selectedElement=user-service', '/element?selectedElement=unknown-node', '/element']) {
        assertBlocks(get(path));
    }
});

test('the landing card leads with a stats block', () => {
    const [first] = get('/card').blocks;
    assert.equal(first.type, 'stats');
    assert.deepEqual(first.items[0], { label: 'Open threats', value: 5 });
});

test('the designer tab names the resource from the query', () => {
    const reply = get('/tab?namespace=demo&resource=architectures%2F1&version=1.0.0');
    assert.deepEqual(reply.blocks[0].items.slice(0, 2), [
        { label: 'Architecture', value: 'demo / architectures/1' },
        { label: 'Version', value: '1.0.0' },
    ]);
});

test('the detail panel lists the threats of the selected element', () => {
    const reply = get('/element?selectedElement=user-service');
    assert.deepEqual(reply.blocks[1].rows.map((r) => r[0]), ['Elevation of privilege', 'Information disclosure']);
    assert.equal(reply.blocks[1].rows[0][1].tone, 'negative');
});

test('an element the model does not name gets a stable generated threat', () => {
    const [threat] = threatsFor('payment-gateway');
    assert.deepEqual(threatsFor('payment-gateway'), [threat]);
    assert.ok(CATEGORIES.includes(threat.category));
});

test('the action counts assessments and echoes the context', () => {
    const context = { namespace: 'demo', resource: 'architectures/1' };
    const first = route('POST', new URL('http://localhost/assessments'), context);
    const second = route('POST', new URL('http://localhost/assessments'), context);
    assert.equal(second.assessment, first.assessment + 1);
    assert.deepEqual(second.context, context);
});

test('the list-threats command route returns every threat', () => {
    const { threats } = get('/threats');
    assert.equal(threats.length, 9);
    assert.deepEqual(Object.keys(threats[0]), ['id', 'element', 'category', 'severity', 'status']);
});

test('an unknown route is not found', () => {
    assert.equal(get('/tab/architectures/1'), null);
    assert.equal(route('DELETE', new URL('http://localhost/threats'), {}), null);
});

test('the seed decorators match the overlay of the decorator view', () => {
    const architecture = { nodes: [{ 'unique-id': 'api-gateway' }, { 'unique-id': 'new-node' }, {}] };
    const decorators = buildDecorators(architecture, { namespace: 'demo', id: '1', version: '1.0.0' });
    const [view] = manifest.contributes['decorator-views'];

    assert.equal(decorators.length, 3);
    for (const d of decorators) {
        assert.equal(d.type, view.match.type);
        assert.deepEqual(d.target, ['/api/calm/namespaces/demo/architectures/1/versions/1-0-0']);
        assert.ok(Object.hasOwn(view.overlay.map, d.data.severity));
        assert.equal(typeof d.data.summary, 'string');
        assert.ok(!Number.isNaN(Date.parse(d.data['assessed-at'])));
    }
    assert.equal(new Set(decorators.map((d) => d['unique-id'])).size, 3);
    assert.deepEqual(decorators.map((d) => d['applies-to'][0]), ['api-gateway', 'api-gateway', 'new-node']);
});

test('every GET route that a UI contribution names is readOnly', () => {
    const routes = new Map(manifest.routes.map((r) => [r.id, r]));
    const gets = Object.values(manifest.contributes).flat().map((c) => routes.get(c.route)).filter((r) => r?.method === 'GET');
    assert.ok(gets.length >= 4);
    for (const route of gets) assert.equal(route.readOnly, true, route.id);
});
