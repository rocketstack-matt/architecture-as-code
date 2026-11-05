// A fixture backend for the example-services extension. It has no dependencies.
// It answers only requests that carry a valid CALM Hub identity assertion, and it never sees the user's token.
import { createServer } from 'node:http';
import { createVerifier } from './identity.mjs';

const PORT = Number(process.env.PORT ?? 8091);
const HUB_URL = process.env.CALM_HUB_URL ?? 'http://localhost:8080';
const ISSUER = process.env.CALM_HUB_ISSUER ?? HUB_URL;

// Made-up data: the services that each namespace owns, and the owner of each service.
const services = {
    finos: [
        { name: 'settlement-engine', owner: 'alice' },
        { name: 'refunds-worker', owner: 'bob' },
    ],
};

const verifyAssertion = createVerifier({
    issuer: ISSUER,
    audience: 'example-services',
    fetchJwks: async () => {
        const res = await fetch(`${HUB_URL}/api/calm/auth/jwks`);
        if (!res.ok) throw new Error(`JWKS request failed with ${res.status}`);
        return res.json();
    },
});

function send(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

async function readJson(req) {
    let text = '';
    for await (const chunk of req) text += chunk;
    return text ? JSON.parse(text) : {};
}

// Hub checked the route's scope for the namespace in the path, and says so in ns.
// Each reply uses only sub and ns, so that it holds nothing that the user cannot read.
async function handle(req, claims, url) {
    const match = url.pathname.match(/^\/namespaces\/([^/]+)\/services$/);
    if (req.method === 'GET' && url.pathname === '/screen') {
        const mine = Object.values(services).flat().filter((s) => s.owner === claims.sub);
        return [200, { hubApi: 0, title: 'Services', blocks: [
            { type: 'markdown', text: `Hello **${claims.sub}**. You own ${mine.length} service(s).` },
            { type: 'table', columns: ['Service'], rows: mine.map((s) => [s.name]) },
        ] }];
    }
    if (match && claims.ns !== match[1]) return [403, { error: 'ns does not match the path' }];
    if (req.method === 'GET' && match) {
        return [200, { services: (services[claims.ns] ?? []).map((s) => s.name) }];
    }
    if (req.method === 'POST' && match) {
        const { name } = await readJson(req);
        if (typeof name !== 'string' || !name) return [400, { error: 'name is required' }];
        (services[claims.ns] ??= []).push({ name, owner: claims.sub });
        return [201, { name }];
    }
    if (req.method === 'POST' && url.pathname === '/search') {
        const { q = '' } = await readJson(req);
        const hits = Object.entries(services).flatMap(([ns, list]) =>
            list.filter((s) => s.name.includes(q)).map((s) => ({ namespace: ns, name: s.name })));
        return [200, { results: hits }];
    }
    return [404, { error: 'not found' }];
}

createServer(async (req, res) => {
    const url = new URL(req.url, 'http://backend');
    let claims;
    try {
        claims = await verifyAssertion(req.headers['x-calm-hub-identity'], { method: req.method, pathAndQuery: req.url });
    } catch (e) {
        console.warn(`rejected ${req.method} ${url.pathname}: ${e.message}`);
        return send(res, 401, { error: 'CALM Hub identity is missing or not valid' });
    }
    try {
        const [status, body] = await handle(req, claims, url);
        console.log(`${req.method} ${url.pathname} for ${claims.sub} (route ${claims.route}, jti ${claims.jti}): ${status}`);
        return send(res, status, body);
    } catch (e) {
        return send(res, 400, { error: 'bad request' });
    }
}).listen(PORT, '127.0.0.1', () => console.log(`example-services backend on http://localhost:${PORT}, trusting ${HUB_URL}`));
