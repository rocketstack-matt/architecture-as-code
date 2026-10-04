import { HOME_DIR, type HintFiles, type Lesson, type LessonState } from '../types';
import { connectsNodes, fileJson, fileText, frontMatterList, nodeById, nodeInterfaces, ranOk } from '../checks';
import { AGENTIC_SDLC_MODEL, ARCHITECTURE, MAPPING, PATTERN, VALIDATE_MODEL } from '../agentic-sdlc-model/lesson';
import { endFiles } from '../chain';

/**
 * The second lesson on a governed agentic SDLC. A coding agent's shortcut needs a connection the model
 * forbids; adding it validates cleanly, because a schema cannot know what the code does, and `calm diff`
 * shows it as a change no spec declared. Then the right path: a spec declares the model change it needs,
 * a human makes it, and the diff shows exactly that change.
 */
export const BASELINE = `${HOME_DIR}/architecture/baseline.json`;
export const SPEC_002 = `${HOME_DIR}/specs/SPEC-002-position-reconciliation.md`;
export const DIFF = 'calm diff -a architecture/baseline.json -b architecture/trade-capture.architecture.json';

const SHORTCUT = { source: 'trade-api', destination: 'position-store' };
const DECLARED = { source: 'position-service', destination: 'trade-api' };
export const DECLARED_RELATIONSHIP = 'position-service-to-trade-api';
const TRADE_API_BINDING = 'TRADE_API_URL';

const MODEL_END = endFiles(AGENTIC_SDLC_MODEL);
const ARCHITECTURE_SEED = MODEL_END[ARCHITECTURE];

const SPEC_002_SEED = `---
id: SPEC-002
title: Position reconciliation
status: approved
owner: risk-tech-leads
calm-nodes: [position-service]
calm-relationships: [position-service-to-trade-api]
model-change: []
---

# SPEC-002 Position reconciliation

## Why
Risk wants to prove, on demand, that the position book agrees with the trades that produced it.

## What
\`GET /positions/{account}/reconciliation\` on **position-service** returns the stored positions, the positions
recomputed from the account's trades, and whether they agree.

## Architectural context (from the CALM model)
- Lives in node \`position-service\`.
- Trades are owned by node \`trade-api\`. Today the model has no relationship from \`position-service\` to \`trade-api\`,
  and \`position-service\` must not read the trade store directly.
- **This spec therefore declares a model change** (\`model-change\` above): a \`trade-api-url\` interface on \`trade-api\`
  bound to \`TRADE_API_URL\`, and a relationship \`position-service-to-trade-api\`. The model change is made and
  approved by a human before any implementation.

## Acceptance
- Returns \`consistent: true\` for an account whose trades were all applied, \`false\` if the book has been altered.
- Returns 502 if trade-api is unavailable.
- Reads \`TRADE_API_URL\` only in \`services/position-service/src/config.ts\`.
`;

type Item = Record<string, unknown>;
const asItem = (value: unknown): Item => (typeof value === 'object' && value !== null ? (value as Item) : {});
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const connects = (id: string, source: string, destination: string, iface: string, description: string): Item => ({
    'unique-id': id,
    description,
    'relationship-type': { connects: { source: { node: source }, destination: { node: destination, interfaces: [iface] } } },
});

/** The learner's architecture with the shortcut relationship added, or the lesson's if the file is not JSON. */
const withShortcut = (files: HintFiles): string => {
    const doc = asItem(fileJson(files, ARCHITECTURE) ?? JSON.parse(ARCHITECTURE_SEED));
    const relationships = Array.isArray(doc.relationships) ? doc.relationships : [];
    doc.relationships = [...relationships, connects('trade-api-to-position-store', SHORTCUT.source, SHORTCUT.destination,
        'position-store-file', 'The shortcut: trade-api reads the position store directly.')];
    return json(doc);
};

/** The baseline plus the change SPEC-002 declares: an interface on trade-api and the relationship to it. */
const withDeclaredChange = (): string => {
    const doc = JSON.parse(ARCHITECTURE_SEED) as Item;
    const nodes = Array.isArray(doc.nodes) ? doc.nodes.map(asItem) : [];
    const tradeApi = nodes.find((node) => node['unique-id'] === 'trade-api') ?? {};
    const interfaces = Array.isArray(tradeApi.interfaces) ? tradeApi.interfaces : [];
    tradeApi.interfaces = [...interfaces, { 'unique-id': 'trade-api-url', protocol: 'HTTP', 'env-binding': TRADE_API_BINDING }];
    const relationships = Array.isArray(doc.relationships) ? doc.relationships : [];
    doc.relationships = [...relationships, connects(DECLARED_RELATIONSHIP, DECLARED.source, DECLARED.destination, 'trade-api-url',
        'position-service reads an account\'s trades from trade-api to reconcile its positions.')];
    return json(doc);
};

const SPEC_002_DECLARED = SPEC_002_SEED.replace('model-change: []', 'model-change: [trade-api, position-service-to-trade-api]');

const hasBinding = (doc: Item | null, node: string, binding: string): boolean =>
    nodeInterfaces(nodeById(doc, node)).some((iface) => iface['env-binding'] === binding);

const shortcutTaken = (state: LessonState) => connectsNodes(state.doc, SHORTCUT.source, SHORTCUT.destination) && state.validation.ok;
const changeDeclared = (state: LessonState) => frontMatterList(fileText(state, SPEC_002), 'model-change').includes(DECLARED_RELATIONSHIP);
const declaredChangeMade = (state: LessonState) =>
    !connectsNodes(state.doc, SHORTCUT.source, SHORTCUT.destination)
    && connectsNodes(state.doc, DECLARED.source, DECLARED.destination)
    && hasBinding(state.doc, 'trade-api', TRADE_API_BINDING)
    && state.validation.ok;
const validated = (state: LessonState) => ranOk(state, 'validate', { architecture: ARCHITECTURE, pattern: PATTERN, mapping: MAPPING });
const diffed = (state: LessonState) => ranOk(state, 'diff', { documentA: BASELINE, documentB: ARCHITECTURE });

export const AGENTIC_SDLC_CHANGE: Lesson = {
    id: 'agentic-sdlc-change',
    title: 'A change to the model: what validation cannot know',
    chainsFrom: 'agentic-sdlc-model',
    editorFile: ARCHITECTURE,
    editableFiles: [ARCHITECTURE, SPEC_002],
    urlMapping: MAPPING,
    seedFiles: {
        ...MODEL_END,
        [BASELINE]: ARCHITECTURE_SEED,
        [SPEC_002]: SPEC_002_SEED,
    },
    steps: [
        {
            id: 'shortcut',
            title: 'Take the agent\'s shortcut',
            body:
                'SPEC-001 asked for an account summary on `trade-api`, which needs positions. The quickest code reads the ' +
                'position store file directly, so the model would need a relationship from `trade-api` to `position-store`. ' +
                'Add it: a `connects` relationship with source `trade-api` and destination `position-store` on its ' +
                'interface `position-store-file`. Save your change.',
            hint: { kind: 'file', content: withShortcut },
            check: shortcutTaken,
        },
        {
            id: 'still-valid',
            title: 'Validation still passes',
            body:
                `Run \`${VALIDATE_MODEL}\`. The summary shows 0 errors. ` +
                'The pattern leaves relationships free, and no schema can know what the code does. The rule on ' +
                '`position-store` is enforced against the code by a gate in the repository; here, the next command shows ' +
                'what changed.',
            hint: { kind: 'commands', commands: [VALIDATE_MODEL] },
            check: (state) => shortcutTaken(state) && validated(state),
        },
        {
            id: 'undeclared',
            title: 'See the undeclared change',
            body:
                `Run \`${DIFF}\`. ` +
                '`architecture/baseline.json` is the model as it was. Under `edgesAdded`, the diff lists the new relationship. ' +
                'SPEC-001 declares no model change, so in the repository the model-diff gate blocks this and routes it to a ' +
                'human. An agent cannot vote itself the permission.',
            hint: { kind: 'commands', commands: [DIFF] },
            check: (state) => shortcutTaken(state) && diffed(state),
        },
        {
            id: 'declare',
            title: 'Declare the change SPEC-002 needs',
            body:
                'Open `specs/SPEC-002-position-reconciliation.md` from the File selector. It needs `position-service` to ' +
                'call `trade-api`, which the model does not allow today. Fill in its `model-change` list with the node that ' +
                'gains an interface and the new relationship: `[trade-api, position-service-to-trade-api]`. Save your change.',
            hint: { kind: 'file', path: SPEC_002, content: SPEC_002_DECLARED },
            check: changeDeclared,
        },
        {
            id: 'model-change',
            title: 'Make the change a human approved',
            body:
                'In the architecture, remove the shortcut relationship. Give `trade-api` an interface with `unique-id` ' +
                '`trade-api-url`, `protocol` `HTTP` and `env-binding` `TRADE_API_URL`, then add a `connects` relationship ' +
                '`position-service-to-trade-api` from `position-service` to that interface. Save your change.',
            hint: { kind: 'file', content: withDeclaredChange() },
            check: declaredChangeMade,
        },
        {
            id: 'validate-and-diff',
            title: 'Validate, then diff',
            body:
                `Run \`${VALIDATE_MODEL}\` and then \`${DIFF}\`. ` +
                'Validation passes: the new interface carries the environment binding the interface Standard requires. ' +
                'The diff shows one added relationship, the one the spec declares.',
            hint: { kind: 'commands', commands: [VALIDATE_MODEL, DIFF] },
            check: (state) => declaredChangeMade(state) && validated(state) && diffed(state),
        },
    ],
    completion: {
        heading: 'Lesson complete',
        message:
            'Validation checks the shape, the diff shows what changed, and the spec says what was allowed. A governed ' +
            'pipeline runs all three on every change, compares the code with the model, reads the review policy from ' +
            'the model, and writes the evidence.',
        links: [
            { to: '?lesson=agentic-sdlc-model', label: 'Back to the first lesson' },
        ],
    },
};
