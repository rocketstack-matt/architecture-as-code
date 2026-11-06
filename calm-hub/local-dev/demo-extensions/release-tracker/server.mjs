// Demo backend for the release-tracker extension. It answers only requests that carry a valid
// CALM Hub identity assertion, and returns Hub "blocks" for each contribution.
import { createServer } from 'node:http';
import { createVerifier } from '../../extensions/example-services/identity.mjs';

const PORT = Number(process.env.PORT ?? 8092);
const HUB_URL = process.env.CALM_HUB_URL ?? 'http://localhost:8080';
const ISSUER = process.env.CALM_HUB_ISSUER ?? HUB_URL;

const verifyAssertion = createVerifier({
    issuer: ISSUER,
    audience: 'release-tracker',
    fetchJwks: async () => {
        const res = await fetch(`${HUB_URL}/api/calm/auth/jwks`);
        if (!res.ok) throw new Error(`JWKS request failed with ${res.status}`);
        return res.json();
    },
});

const releases = [
    { version: '2.4.0', status: 'in-progress', date: '2026-11-06', owner: 'payments-team' },
    { version: '2.3.1', status: 'released', date: '2026-10-30', owner: 'payments-team' },
    { version: '2.3.0', status: 'rolled-back', date: '2026-10-22', owner: 'orders-team' },
    { version: '2.2.0', status: 'released', date: '2026-10-08', owner: 'platform-team' },
];
const tone = { released: 'positive', 'in-progress': 'info', 'rolled-back': 'negative' };
const elements = {
    'web-app': { owner: 'web-team', lastRelease: '2.3.1', risk: 'Low', oncall: 'Priya' },
    'api-gateway': { owner: 'platform-team', lastRelease: '2.3.1', risk: 'Medium', oncall: 'Sam' },
    'user-service': { owner: 'identity-team', lastRelease: '2.2.0', risk: 'High', oncall: 'Jo' },
    'order-service': { owner: 'orders-team', lastRelease: '2.4.0 (rolling out)', risk: 'Medium', oncall: 'Alex' },
    database: { owner: 'data-team', lastRelease: '2.2.0', risk: 'Low', oncall: 'Kim' },
    'message-queue': { owner: 'platform-team', lastRelease: '2.3.0', risk: 'Low', oncall: 'Sam' },
};
let reviews = 0;

const screen = (title, blocks) => ({ hubApi: 0, title, blocks });
const releaseRows = () =>
    releases.map((r) => [r.version, { badge: r.status, tone: tone[r.status] }, r.date, r.owner]);

function route(method, url, body) {
    const q = url.searchParams;
    if (method === 'GET' && url.pathname === '/screen') {
        return screen('Releases', [
            { type: 'alert', tone: 'warning', text: 'Release 2.4.0 is rolling out: order-service is at 40%.' },
            { type: 'stats', items: [
                { label: 'Releases this month', value: 3 },
                { label: 'Success rate', value: '83%' },
                { label: 'Mean lead time', value: '2.1 days' },
                { label: 'Open reviews', value: reviews },
            ] },
            { type: 'table', columns: ['Version', 'Status', 'Date', 'Owner'], rows: releaseRows() },
            { type: 'markdown', text: '### How releases work\nEach release goes through **review**, **canary** and **full rollout**. A rollback opens an incident automatically.' },
            { type: 'links', items: [
                { label: 'Release runbook', href: 'https://example.org/runbooks/release' },
                { label: 'Demo architecture', hub: { namespace: 'demo', type: 'architectures', id: '1', version: '1.0.0' } },
            ] },
        ]);
    }
    if (method === 'GET' && url.pathname === '/tab') {
        return screen('Releases', [
            { type: 'keyValue', items: [
                { label: 'Architecture', value: `${q.get('namespace') ?? '?'} / ${q.get('resource') ?? '?'}` },
                { label: 'Version', value: q.get('version') ?? '?' },
                { label: 'Current release', value: '2.4.0 (rolling out)' },
                { label: 'Change freeze', value: 'None' },
            ] },
            { type: 'table', columns: ['Version', 'Status', 'Date', 'Owner'], rows: releaseRows() },
        ]);
    }
    if (method === 'GET' && url.pathname === '/card') {
        return screen('Release health', [
            { type: 'stats', items: [
                { label: 'In flight', value: 1 },
                { label: 'Rolled back (30 days)', value: 1 },
            ] },
            { type: 'cards', items: [
                { title: '2.4.0 rolling out', subtitle: 'order-service at 40%' },
                { title: '2.3.0 rolled back', subtitle: 'orders-team, 22 Oct' },
            ] },
        ]);
    }
    if (method === 'GET' && url.pathname === '/element') {
        const id = q.get('selectedElement');
        const e = elements[id];
        if (!e) return screen('Release info', [{ type: 'alert', tone: 'neutral', text: `No release data for ${id ?? 'this element'}.` }]);
        const riskTone = { Low: 'positive', Medium: 'warning', High: 'negative' }[e.risk];
        return screen('Release info', [
            { type: 'keyValue', items: [
                { label: 'Owner', value: e.owner },
                { label: 'Last release', value: e.lastRelease },
                { label: 'On call', value: e.oncall },
            ] },
            { type: 'table', columns: ['Risk'], rows: [[{ badge: e.risk, tone: riskTone }]] },
        ]);
    }
    if (method === 'POST' && url.pathname === '/reviews') {
        reviews += 1;
        return { hubApi: 0, ok: true, review: reviews, context: body };
    }
    if (method === 'GET' && url.pathname === '/releases') {
        return { releases: releases.map(({ version, status, date }) => ({ version, status, date })) };
    }
    return null;
}

createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let claims;
    try {
        claims = await verifyAssertion(req.headers['x-calm-hub-identity'], { method: req.method, pathAndQuery: req.url });
    } catch (e) {
        console.warn(`rejected ${req.method} ${url.pathname}: ${e.message}`);
        res.writeHead(401).end();
        return;
    }
    let body = {};
    let text = '';
    for await (const chunk of req) text += chunk;
    if (text) body = JSON.parse(text);
    const reply = route(req.method, url, body);
    console.log(`${req.method} ${url.pathname}${url.search} for ${claims.sub}: ${reply ? 200 : 404}`);
    res.writeHead(reply ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(reply ?? { error: 'not found' }));
}).listen(PORT, '127.0.0.1', () => console.log(`release-tracker backend on ${PORT}`));
