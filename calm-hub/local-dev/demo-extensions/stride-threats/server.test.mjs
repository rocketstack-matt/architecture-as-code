// Run with: node --test calm-hub/local-dev/demo-extensions/stride-threats/server.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBackend } from '../backend-harness.mjs';

test('answers 400 to a malformed JSON body, and keeps serving', async (t) => {
    const backend = await startBackend(new URL('./server.mjs', import.meta.url), 'stride-threats');
    t.after(backend.stop);

    const bad = await backend.request('POST', '/assessments', '{bad');
    assert.equal(bad.status, 400);
    assert.deepEqual(await bad.json(), { error: 'the body is not valid JSON' });

    assert.equal((await backend.request('POST', '/assessments', '{}')).status, 200);
    assert.equal((await backend.request('GET', '/screen')).status, 200);
});
