// The routes of the stride-threats demo backend. Each returns Hub "blocks", or null for not found.
import { CATEGORIES, modelThreats, severityTone, statusTone, threatsFor } from './threats.mjs';

let assessments = 0;

const screen = (title, blocks) => ({ hubApi: 0, title, blocks });
const badge = (text, tone) => ({ badge: text, tone });
const rows = (threats) => threats.map((t) =>
    [t.id, t.element, t.category, badge(t.severity, severityTone[t.severity]), badge(t.status, statusTone[t.status])]);
const columns = ['Threat', 'Element', 'Category', 'Severity', 'Status'];
const open = (threats) => threats.filter((t) => t.status === 'open');
const countBy = (threats, key, value) => threats.filter((t) => t[key] === value).length;

export function route(method, url, body) {
    const q = url.searchParams;
    const threats = modelThreats();
    if (method === 'GET' && url.pathname === '/screen') {
        return screen('Threat model', [
            { type: 'alert', tone: 'negative', text: 'user-service has an open critical threat: role claim trusted from client.' },
            { type: 'stats', items: [
                { label: 'Open threats', value: open(threats).length },
                { label: 'Critical', value: countBy(threats, 'severity', 'critical') },
                { label: 'Mitigated', value: countBy(threats, 'status', 'mitigated') },
                { label: 'Assessments started', value: assessments },
            ] },
            { type: 'table', columns: ['Category', 'Open', 'Total'],
                rows: CATEGORIES.map((c) => [c, countBy(open(threats), 'category', c), countBy(threats, 'category', c)]) },
            { type: 'table', columns, rows: rows(threats) },
            { type: 'markdown', text: '### STRIDE\n**S**poofing, **T**ampering, **R**epudiation, **I**nformation disclosure, **D**enial of service and **E**levation of privilege.' },
            { type: 'links', items: [
                { label: 'STRIDE threat modelling', href: 'https://example.org/security/stride' },
                { label: 'Demo architecture', hub: { namespace: 'demo', type: 'architectures', id: '1', version: '1.0.0' } },
            ] },
        ]);
    }
    if (method === 'GET' && url.pathname === '/tab') {
        return screen('Threats', [
            { type: 'keyValue', items: [
                { label: 'Architecture', value: `${q.get('namespace') ?? '?'} / ${q.get('resource') ?? '?'}` },
                { label: 'Version', value: q.get('version') ?? '?' },
                { label: 'Last assessment', value: '2 Nov 2026' },
                { label: 'Open threats', value: String(open(threats).length) },
            ] },
            { type: 'table', columns, rows: rows(open(threats)) },
        ]);
    }
    if (method === 'GET' && url.pathname === '/card') {
        return screen('Threat posture', [
            { type: 'stats', items: [
                { label: 'Open threats', value: open(threats).length },
                { label: 'Critical', value: countBy(threats, 'severity', 'critical') },
                { label: 'High', value: countBy(open(threats), 'severity', 'high') },
                { label: 'Mitigated', value: countBy(threats, 'status', 'mitigated') },
            ] },
            { type: 'alert', tone: 'negative', text: '1 critical threat is open.' },
        ]);
    }
    if (method === 'GET' && url.pathname === '/element') {
        const id = q.get('selectedElement');
        if (!id) return screen('STRIDE threats', [{ type: 'alert', tone: 'neutral', text: 'Select an element to see its threats.' }]);
        const own = threatsFor(id);
        return screen('STRIDE threats', [
            { type: 'keyValue', items: [
                { label: 'Open threats', value: String(open(own).length) },
                { label: 'Categories', value: [...new Set(own.map((t) => t.category))].join(', ') },
            ] },
            { type: 'table', columns: ['Category', 'Severity', 'Threat', 'Mitigation'],
                rows: own.map((t) => [t.category, badge(t.severity, severityTone[t.severity]), t.title, t.mitigation]) },
        ]);
    }
    if (method === 'POST' && url.pathname === '/assessments') {
        assessments += 1;
        return { hubApi: 0, ok: true, assessment: assessments, context: body };
    }
    if (method === 'GET' && url.pathname === '/threats') {
        return { threats: threats.map(({ id, element, category, severity, status }) => ({ id, element, category, severity, status })) };
    }
    return null;
}
