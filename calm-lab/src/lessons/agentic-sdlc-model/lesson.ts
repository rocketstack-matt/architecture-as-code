import { HOME_DIR, type Lesson, type LessonState } from '../types';
import { fileJson, ranOk, rejected } from '../checks';
import { SEED_FILES } from './seed';

/**
 * The first of two lessons on a governed agentic SDLC: a small trade capture estate whose model carries
 * controls from the FINOS SDLC Common Controls Catalog as data. The pattern says which controls every
 * architecture must carry, which catalog document each cites and which parameters the estate's gates read;
 * the node and interface Standards say what every node must carry. Three deliberate breakages show which
 * layer catches what, then the learner repairs one.
 */
export const ARCHITECTURE = `${HOME_DIR}/architecture/trade-capture.architecture.json`;
export const PATTERN = `${HOME_DIR}/architecture/governed-service.pattern.json`;
export const MAPPING = `${HOME_DIR}/architecture/url-mapping.json`;
export const MISSING_PARAMETER = `${HOME_DIR}/architecture/broken/missing-parameter.json`;
export const MISSING_SOURCE_PATH = `${HOME_DIR}/architecture/broken/missing-source-path.json`;
export const WRONG_CONTROL_ID = `${HOME_DIR}/architecture/broken/wrong-control-id.json`;

const validate = (architecture: string) =>
    `calm validate -p architecture/governed-service.pattern.json -a ${architecture} -u architecture/url-mapping.json -f pretty`;
export const VALIDATE_MODEL = validate('architecture/trade-capture.architecture.json');
const VALIDATE_MISSING_PARAMETER = validate('architecture/broken/missing-parameter.json');
const VALIDATE_MISSING_SOURCE_PATH = validate('architecture/broken/missing-source-path.json');
const VALIDATE_WRONG_CONTROL_ID = validate('architecture/broken/wrong-control-id.json');

const REQUIREMENTS_CONTROL = 'sdlc-prev-004-requirements-repository';
const GATING_CONTROL = 'sdlc-prev-012-deployment-gating';

type Item = Record<string, unknown>;
const asItem = (value: unknown): Item => (typeof value === 'object' && value !== null ? (value as Item) : {});

/** The config of a system-level control's first requirement, or `{}`. The object itself, so edits stick. */
export function controlConfig(doc: Item | null | undefined, control: string): Item {
    const requirements = asItem(asItem(doc?.controls)[control]).requirements;
    return Array.isArray(requirements) ? asItem(asItem(requirements[0]).config) : {};
}

const nodeIn = (doc: Item, id: string): Item =>
    asItem(Array.isArray(doc.nodes) ? doc.nodes.find((node) => asItem(node)['unique-id'] === id) : undefined);

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const model = (): Item => JSON.parse(SEED_FILES[ARCHITECTURE]) as Item;
const broken = (edit: (doc: Item) => void): string => {
    const doc = model();
    edit(doc);
    return json(doc);
};

// The same model three ways, each wrong in exactly one place.
const MISSING_PARAMETER_SEED = broken((doc) => { delete controlConfig(doc, REQUIREMENTS_CONTROL).repository; });
const MISSING_SOURCE_PATH_SEED = broken((doc) => { delete asItem(nodeIn(doc, 'trade-api').metadata)['source-path']; });
const WRONG_CONTROL_ID_SEED = broken((doc) => { controlConfig(doc, GATING_CONTROL)['control-id'] = 'SDLC-PREV-999'; });

const VALIDATE_FILES = { pattern: PATTERN, mapping: MAPPING };

/** The learner put a requirements repository back, any path, next to the audit trail the pattern also wants. */
const parameterRestored = (state: LessonState): boolean => {
    const config = controlConfig(fileJson(state, MISSING_PARAMETER), REQUIREMENTS_CONTROL);
    return typeof config.repository === 'string' && config.repository.trim().length > 0 && typeof config['audit-trail'] === 'string';
};

export const AGENTIC_SDLC_MODEL: Lesson = {
    id: 'agentic-sdlc-model',
    title: 'A governed model: controls as data',
    editorFile: ARCHITECTURE,
    editableFiles: [ARCHITECTURE, MISSING_PARAMETER],
    urlMapping: MAPPING,
    seedFiles: {
        ...SEED_FILES,
        [MISSING_PARAMETER]: MISSING_PARAMETER_SEED,
        [MISSING_SOURCE_PATH]: MISSING_SOURCE_PATH_SEED,
        [WRONG_CONTROL_ID]: WRONG_CONTROL_ID_SEED,
    },
    steps: [
        {
            id: 'validate-model',
            title: 'Validate the model',
            body:
                'The open file is a small trade capture system: six nodes, five relationships, and controls from the ' +
                'FINOS SDLC Common Controls Catalog attached as data. Look at the Diagram tab, then find the control on the ' +
                '`position-store` node: only `position-service` may connect to it. ' +
                `Run \`${VALIDATE_MODEL}\`. ` +
                '`-p` is the pattern this estate enforces, `-a` the architecture, and `-u` a mapping from the CALM Hub URLs ' +
                'the model cites (the catalog\'s control requirement documents, their Standard, the node and interface ' +
                'Standards) to copies under `architecture/`, so validation needs no network. The summary shows 0 errors.',
            hint: { kind: 'commands', commands: [VALIDATE_MODEL] },
            check: (state) => ranOk(state, 'validate', { architecture: ARCHITECTURE, ...VALIDATE_FILES }),
        },
        {
            id: 'missing-parameter',
            title: 'A missing parameter fails on the pattern',
            body:
                '`architecture/broken/missing-parameter.json` is the same model with `repository` removed from the ' +
                'Requirements Repository control. ' +
                `Run \`${VALIDATE_MISSING_PARAMETER}\`. This command is meant to fail. ` +
                'The pattern says what this estate requires of each control, so the error names the missing property ' +
                'and the control it belongs to.',
            hint: { kind: 'commands', commands: [{ run: VALIDATE_MISSING_PARAMETER, expect: 'failure' }] },
            check: (state) => rejected(state, { architecture: MISSING_PARAMETER, ...VALIDATE_FILES }),
        },
        {
            id: 'missing-source-path',
            title: 'A service without a source path fails on the node Standard',
            body:
                '`architecture/broken/missing-source-path.json` has no `source-path` on the `trade-api` service. ' +
                `Run \`${VALIDATE_MISSING_SOURCE_PATH}\`. This command is meant to fail. ` +
                'The pattern applies the governed-node Standard to every node, and that Standard requires a source path ' +
                'on every service: without it, nothing can tell which code belongs to the node.',
            hint: { kind: 'commands', commands: [{ run: VALIDATE_MISSING_SOURCE_PATH, expect: 'failure' }] },
            check: (state) => rejected(state, { architecture: MISSING_SOURCE_PATH, ...VALIDATE_FILES }),
        },
        {
            id: 'wrong-control-id',
            title: 'A wrong control id fails on the catalog document',
            body:
                '`architecture/broken/wrong-control-id.json` says the Deployment Gating control is `SDLC-PREV-999`. ' +
                `Run \`${VALIDATE_WRONG_CONTROL_ID}\`. This command is meant to fail. ` +
                'Each control cites the catalog\'s own control requirement document on CALM Hub as its `requirement-url`, ' +
                'and that document pins the control id and name, so a config cannot claim to be a control it is not.',
            hint: { kind: 'commands', commands: [{ run: VALIDATE_WRONG_CONTROL_ID, expect: 'failure' }] },
            check: (state) => rejected(state, { architecture: WRONG_CONTROL_ID, ...VALIDATE_FILES }),
        },
        {
            id: 'fix-parameter',
            title: 'Put the parameter back',
            body:
                'Open `architecture/broken/missing-parameter.json` from the File selector. In the ' +
                '`sdlc-prev-004-requirements-repository` control\'s `config`, add a `repository` next to `audit-trail`: ' +
                'the path where this estate keeps its specs, such as `specs/`. Save your change.',
            hint: {
                kind: 'file',
                path: MISSING_PARAMETER,
                content: (files) => {
                    const doc = asItem(fileJson(files, MISSING_PARAMETER) ?? model());
                    controlConfig(doc, REQUIREMENTS_CONTROL).repository = controlConfig(model(), REQUIREMENTS_CONTROL).repository;
                    return json(doc);
                },
            },
            check: parameterRestored,
        },
        {
            id: 'validate-fix',
            title: 'Validate your fix',
            body:
                `Run \`${VALIDATE_MISSING_PARAMETER}\` again. The summary shows 0 errors. ` +
                'Three layers caught three faults: the pattern a missing parameter, the node Standard a missing source ' +
                'path, the catalog document a wrong control id. Standards define, the pattern enforces, the model complies.',
            hint: { kind: 'commands', commands: [VALIDATE_MISSING_PARAMETER] },
            check: (state) => parameterRestored(state) && ranOk(state, 'validate', { architecture: MISSING_PARAMETER, ...VALIDATE_FILES }),
        },
    ],
    completion: {
        heading: 'Lesson complete',
        message:
            'A control in a catalog is prose. A control on a CALM node is data with a schema, an owner and an ' +
            'enforcement point. The next lesson changes the model and sees what validation can and cannot know.',
        links: [
            { to: '?lesson=agentic-sdlc-change', label: 'Next lesson: A change to the model' },
        ],
    },
};
