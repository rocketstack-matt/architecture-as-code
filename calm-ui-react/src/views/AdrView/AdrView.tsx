import { getAdrStatusColor } from '@finos/calm-design-tokens';
import type { AdrDocument, AdrDocumentEnvelope, AdrOption, AdrLink } from './types.js';

interface AdrViewProps {
    /** Either the bare ADR document or the Hub UI envelope (`{ adr: ... }`). */
    adr: AdrDocument | AdrDocumentEnvelope;
}

function unwrap(adr: AdrDocument | AdrDocumentEnvelope): AdrDocument {
    if (adr && typeof adr === 'object' && 'adr' in adr && adr.adr) {
        return adr.adr as AdrDocument;
    }
    return adr as AdrDocument;
}

function formatDate(value: string | undefined): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
    const color = getAdrStatusColor(status);
    return (
        <span
            style={{
                display: 'inline-block',
                marginLeft: 12,
                padding: '2px 10px',
                borderRadius: 999,
                background: color,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                verticalAlign: 'middle',
            }}
        >
            {status}
        </span>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{ marginTop: 16 }}>
            <h2
                style={{
                    fontSize: 14,
                    margin: '0 0 6px 0',
                    color: 'var(--calm-text-secondary, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    borderBottom: '1px solid var(--calm-border-default, #e2e8f0)',
                    paddingBottom: 4,
                }}
            >
                {title}
            </h2>
            {children}
        </section>
    );
}

function OptionBlock({ option }: { option: AdrOption }) {
    const positives = option.positiveConsequences ?? [];
    const negatives = option.negativeConsequences ?? [];
    return (
        <div
            style={{
                marginTop: 8,
                padding: 12,
                border: '1px solid var(--calm-border-default, #e2e8f0)',
                borderRadius: 8,
            }}
        >
            {option.name && (
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{option.name}</div>
            )}
            {option.description && (
                <div style={{ fontSize: 13, color: 'var(--calm-text-primary, #1e293b)', whiteSpace: 'pre-wrap' }}>
                    {option.description}
                </div>
            )}
            {positives.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    <strong style={{ color: 'var(--calm-status-success, #16a34a)' }}>Pros</strong>
                    <ul style={{ margin: '4px 0 0 18px' }}>
                        {positives.map((p, i) => (
                            <li key={i} style={{ fontSize: 13 }}>{p}</li>
                        ))}
                    </ul>
                </div>
            )}
            {negatives.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    <strong style={{ color: 'var(--calm-status-error, #dc2626)' }}>Cons</strong>
                    <ul style={{ margin: '4px 0 0 18px' }}>
                        {negatives.map((p, i) => (
                            <li key={i} style={{ fontSize: 13 }}>{p}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function LinkRow({ link }: { link: AdrLink }) {
    const label = link.text ?? link.description ?? link.href ?? link.rel ?? '';
    if (link.href) {
        return (
            <li>
                <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ color: 'var(--calm-color-accent, #007dff)' }}
                >
                    {label}
                </a>
                {link.rel && (
                    <span style={{ marginLeft: 6, color: 'var(--calm-text-muted, #94a3b8)' }}>
                        ({link.rel})
                    </span>
                )}
            </li>
        );
    }
    return <li>{label}</li>;
}

/**
 * Defensive ADR renderer. Renders whichever sections are populated and skips
 * the rest, so partial ADRs (drafts, freshly-created documents) still produce
 * a useful view. Pure props in — Hub UI fetches the document via CalmService,
 * the VSCode extension reads it from disk and posts it into the webview.
 */
export function AdrView({ adr: input }: AdrViewProps) {
    const adr = unwrap(input);
    const created = formatDate(adr.creationDateTime);
    const updated = formatDate(adr.updateDateTime);
    const considered = adr.consideredOptions ?? [];
    const drivers = adr.decisionDrivers ?? [];
    const links = adr.links ?? [];
    const chosen = adr.decisionOutcome?.chosenOption;
    const chosenLabel =
        typeof chosen === 'string'
            ? chosen
            : chosen?.name ?? chosen?.description ?? '—';

    return (
        <article
            style={{
                padding: 24,
                maxWidth: 920,
                margin: '0 auto',
                color: 'var(--calm-text-primary, #1e293b)',
                fontFamily: 'var(--calm-font-sans, system-ui)',
            }}
        >
            <header>
                <h1 style={{ display: 'inline-block', margin: 0, fontSize: 28 }}>
                    {adr.title ?? 'Untitled ADR'}
                </h1>
                {adr.status && <StatusBadge status={adr.status} />}
            </header>

            {(created || updated) && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--calm-text-muted, #94a3b8)' }}>
                    {created && <span>Created {created}</span>}
                    {created && updated && <span> · </span>}
                    {updated && <span>Updated {updated}</span>}
                </div>
            )}

            {adr.contextAndProblemStatement && (
                <Section title="Context and problem">
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                        {adr.contextAndProblemStatement}
                    </p>
                </Section>
            )}

            {drivers.length > 0 && (
                <Section title="Decision drivers">
                    <ul style={{ margin: '0 0 0 18px' }}>
                        {drivers.map((d, i) => (
                            <li key={i} style={{ lineHeight: 1.5 }}>{d}</li>
                        ))}
                    </ul>
                </Section>
            )}

            {considered.length > 0 && (
                <Section title="Considered options">
                    {considered.map((opt, i) => (
                        <OptionBlock key={i} option={opt} />
                    ))}
                </Section>
            )}

            {chosen && (
                <Section title="Decision outcome">
                    <div style={{ fontWeight: 600 }}>{chosenLabel}</div>
                    {typeof chosen !== 'string' && chosen.description && (
                        <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                            {chosen.description}
                        </p>
                    )}
                    {adr.decisionOutcome?.rationale && (
                        <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                            {adr.decisionOutcome.rationale}
                        </p>
                    )}
                </Section>
            )}

            {links.length > 0 && (
                <Section title="Links">
                    <ul style={{ margin: '0 0 0 18px' }}>
                        {links.map((l, i) => (
                            <LinkRow key={i} link={l} />
                        ))}
                    </ul>
                </Section>
            )}
        </article>
    );
}
