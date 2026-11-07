// The made-up threat model that the backend and the decorator seed script share.
export const CATEGORIES = [
    'Spoofing',
    'Tampering',
    'Repudiation',
    'Information disclosure',
    'Denial of service',
    'Elevation of privilege',
];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const severityTone = { low: 'positive', medium: 'warning', high: 'negative', critical: 'negative' };
export const statusTone = { open: 'warning', mitigated: 'positive', accepted: 'neutral' };

const threat = (id, element, category, severity, status, title, mitigation) =>
    ({ id, element, category, severity, status, title, mitigation, assessedAt: '2026-11-02T09:00:00Z' });

// The node ids of the release-tracker demo, so that both demos describe the same architecture.
const KNOWN = [
    threat('T-01', 'web-app', 'Spoofing', 'medium', 'mitigated', 'Session cookie replay', 'Short-lived, SameSite cookies'),
    threat('T-02', 'web-app', 'Tampering', 'low', 'open', 'Client-side price change', 'Server recalculates totals'),
    threat('T-03', 'api-gateway', 'Denial of service', 'high', 'open', 'Unthrottled public endpoints', 'Rate limits per client'),
    threat('T-04', 'api-gateway', 'Spoofing', 'medium', 'mitigated', 'Forged JWT', 'Verify signature and audience'),
    threat('T-05', 'user-service', 'Elevation of privilege', 'critical', 'open', 'Role claim trusted from client', 'Read roles from the directory'),
    threat('T-06', 'user-service', 'Information disclosure', 'high', 'open', 'PII in debug logs', 'Redact log fields'),
    threat('T-07', 'order-service', 'Repudiation', 'medium', 'accepted', 'No audit trail for refunds', 'Append-only audit log'),
    threat('T-08', 'database', 'Information disclosure', 'high', 'mitigated', 'Backups not encrypted', 'KMS-encrypted snapshots'),
    threat('T-09', 'message-queue', 'Tampering', 'medium', 'open', 'Unsigned messages', 'Sign and verify payloads'),
];

const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** The threats of one element. An element the model does not name gets one stable, generated threat. */
export function threatsFor(element) {
    const known = KNOWN.filter((t) => t.element === element);
    if (known.length > 0) return known;
    const h = hash(element);
    const category = CATEGORIES[h % CATEGORIES.length];
    return [threat(`G-${(h % 9000) + 1000}`, element, category, SEVERITIES[h % SEVERITIES.length],
        'open', `${category} of ${element} not yet assessed`, 'Assess in the next STRIDE review')];
}

export const modelThreats = () => KNOWN;

/** The `threat-model` decorators for one architecture version, one per threat of each of its nodes. */
export function buildDecorators(architecture, { namespace, id, version }) {
    const target = `/api/calm/namespaces/${namespace}/architectures/${id}/versions/${version.replace(/\./g, '-')}`;
    const nodes = (architecture?.nodes ?? []).map((n) => n['unique-id']).filter((n) => typeof n === 'string');
    return nodes.flatMap(threatsFor).map((t) => ({
        'unique-id': `stride-${namespace}-${id}-${t.id}-${t.element}`,
        type: 'threat-model',
        target: [target],
        'target-type': ['architecture'],
        'applies-to': [t.element],
        data: {
            'threat-id': t.id,
            category: t.category,
            severity: t.severity,
            status: t.status,
            summary: `${t.category}: ${t.title} (${t.status})`,
            mitigation: t.mitigation,
            'assessed-at': t.assessedAt,
        },
    }));
}
