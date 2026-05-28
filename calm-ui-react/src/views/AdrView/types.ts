/**
 * Minimal ADR shape rendered by AdrView. Mirrors the fields produced by the
 * CALM ADR schema; every field is optional so partially-populated ADRs still
 * render gracefully.
 */
export interface AdrLink {
    rel?: string;
    href?: string;
    text?: string;
    description?: string;
}

export interface AdrOption {
    name?: string;
    description?: string;
    positiveConsequences?: string[];
    negativeConsequences?: string[];
}

export interface AdrDecisionOutcome {
    chosenOption?: AdrOption | string;
    rationale?: string;
}

export interface AdrDocument {
    title?: string;
    status?: string;
    contextAndProblemStatement?: string;
    decisionDrivers?: string[];
    consideredOptions?: AdrOption[];
    decisionOutcome?: AdrDecisionOutcome;
    links?: AdrLink[];
    creationDateTime?: string;
    updateDateTime?: string;
    /** Catch-all for fields not modelled above. */
    [key: string]: unknown;
}

/**
 * Some Hub UI endpoints return the ADR nested under an `adr` key. AdrView
 * accepts either the bare document or the envelope shape.
 *
 * Named `AdrDocumentEnvelope` rather than `AdrEnvelope` to avoid colliding
 * with the adapter-level `AdrEnvelope` type used by CalmDataSource.
 */
export interface AdrDocumentEnvelope {
    adr: AdrDocument;
}
