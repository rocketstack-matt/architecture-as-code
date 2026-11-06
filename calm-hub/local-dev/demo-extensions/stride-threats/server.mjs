// Demo backend for the stride-threats extension. It answers only requests that carry a valid
// CALM Hub identity assertion, and returns Hub "blocks" for each contribution.
import { createServer } from 'node:http';
import { createVerifier } from '../../extensions/example-services/identity.mjs';
import { route } from './routes.mjs';

const PORT = Number(process.env.PORT ?? 8093);
const HUB_URL = process.env.CALM_HUB_URL ?? 'http://localhost:8080';
// Hub signs `iss` with calm.hub.base-url, whatever address the JWKS comes from.
const ISSUER = process.env.CALM_HUB_ISSUER ?? 'http://localhost:8080';

const verifyAssertion = createVerifier({
    issuer: ISSUER,
    audience: 'stride-threats',
    fetchJwks: async () => {
        const res = await fetch(`${HUB_URL}/api/calm/auth/jwks`);
        if (!res.ok) throw new Error(`JWKS request failed with ${res.status}`);
        return res.json();
    },
});

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
}).listen(PORT, '127.0.0.1', () => console.log(`stride-threats backend on http://localhost:${PORT}, trusting issuer ${ISSUER}`));
