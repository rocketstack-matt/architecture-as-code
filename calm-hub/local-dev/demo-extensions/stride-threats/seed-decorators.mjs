// Writes example `threat-model` decorators for the nodes of one architecture version, so that the
// STRIDE overlay shows on the diagram. A decorator whose unique-id is already there is skipped.
// Usage: node seed-decorators.mjs [namespace] [numeric architecture id] [version]
import { buildDecorators } from './threats.mjs';

const HUB_URL = process.env.CALM_HUB_URL ?? 'http://localhost:8080';
const [namespace = 'demo', id = '1', version = '1.0.0'] = process.argv.slice(2);
const headers = { 'Content-Type': 'application/json' };
if (process.env.CALM_HUB_TOKEN) headers.Authorization = `Bearer ${process.env.CALM_HUB_TOKEN}`;

async function call(method, path, body) {
    const res = await fetch(`${HUB_URL}${path}`, { method, headers, body: body && JSON.stringify(body) });
    if (!res.ok) throw new Error(`${method} ${path} failed with ${res.status}: ${await res.text()}`);
    return res.json();
}

const base = `/api/calm/namespaces/${encodeURIComponent(namespace)}`;
const architecture = await call('GET', `${base}/architectures/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`);
const decorators = buildDecorators(architecture, { namespace, id, version });
const existing = await call('GET', `${base}/decorators/values?${new URLSearchParams({ target: decorators[0]?.target[0] ?? '', type: 'threat-model' })}`);
const present = new Set((existing.values ?? []).map((d) => d['unique-id'] ?? d.uniqueId));

let written = 0;
for (const decorator of decorators) {
    if (present.has(decorator['unique-id'])) continue;
    await call('POST', `${base}/decorators`, decorator);
    written += 1;
}
console.log(`wrote ${written} threat-model decorators for ${namespace}/${id}/${version} (${decorators.length - written} already there)`);
