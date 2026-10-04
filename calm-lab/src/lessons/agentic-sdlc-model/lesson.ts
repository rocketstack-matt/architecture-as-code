import { HOME_DIR, type Lesson, type LessonState } from '../types';
import { fileJson, ranOk, rejected } from '../checks';
import { SEED_FILES } from './seed';

/**
 * The first of two lessons on a governed agentic SDLC: a small trade capture estate whose model carries
 * controls from the FINOS SDLC Common Controls Catalog as data. The pattern says which controls every
 * architecture must carry, which catalog document each cites and which parameters the estate's gates read;
 * the node and interface Standards say what every node must carry. The model opens with one wrong control
 * id, the learner repairs it and validates, then two more breakages show which layer catches what.
 */
export const ARCHITECTURE = `${HOME_DIR}/architecture/trade-capture.architecture.json`;
export const PATTERN = `${HOME_DIR}/architecture/governed-service.pattern.json`;
export const MAPPING = `${HOME_DIR}/architecture/url-mapping.json`;
export const MISSING_PARAMETER = `${HOME_DIR}/architecture/broken/missing-parameter.json`;
export const MISSING_SOURCE_PATH = `${HOME_DIR}/architecture/broken/missing-source-path.json`;

const validate = (architecture: string) =>
    `calm validate -p architecture/governed-service.pattern.json -a ${architecture} -u architecture/url-mapping.json -f pretty`;
export const VALIDATE_MODEL = validate('architecture/trade-capture.architecture.json');
const VALIDATE_MISSING_PARAMETER = validate('architecture/broken/missing-parameter.json');
const VALIDATE_MISSING_SOURCE_PATH = validate('architecture/broken/missing-source-path.json');

const REQUIREMENTS_CONTROL = 'sdlc-prev-004-requirements-repository';
const GATING_CONTROL = 'sdlc-prev-012-deployment-gating';
export const GATING_CONTROL_ID = 'SDLC-PREV-012';
const WRONG_CONTROL_ID = 'SDLC-PREV-999';

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

// The same model three ways, each wrong in exactly one place. The first is the file the lesson opens on.
const WRONG_CONTROL_ID_SEED = broken((doc) => { controlConfig(doc, GATING_CONTROL)['control-id'] = WRONG_CONTROL_ID; });
const MISSING_PARAMETER_SEED = broken((doc) => { delete controlConfig(doc, REQUIREMENTS_CONTROL).repository; });
const MISSING_SOURCE_PATH_SEED = broken((doc) => { delete asItem(nodeIn(doc, 'trade-api').metadata)['source-path']; });

const VALIDATE_FILES = { pattern: PATTERN, mapping: MAPPING };

/** The learner gave the deployment gating control the catalog's id back, and the saved file validates live. */
const controlIdFixed = (state: LessonState): boolean =>
    controlConfig(fileJson(state, ARCHITECTURE), GATING_CONTROL)['control-id'] === GATING_CONTROL_ID && state.validation.ok;

export const AGENTIC_SDLC_MODEL: Lesson = {
    id: 'agentic-sdlc-model',
    title: 'A governed model: controls as data',
    editorFile: ARCHITECTURE,
    editableFiles: [ARCHITECTURE, MISSING_PARAMETER, MISSING_SOURCE_PATH],
    urlMapping: MAPPING,
    seedFiles: {
        ...SEED_FILES,
        [ARCHITECTURE]: WRONG_CONTROL_ID_SEED,
        [MISSING_PARAMETER]: MISSING_PARAMETER_SEED,
        [MISSING_SOURCE_PATH]: MISSING_SOURCE_PATH_SEED,
    },
    steps: [
        {
            id: 'validate-model',
            title: 'Validate the model',
            body:
                'The open file is a small trade capture system: six nodes, five relationships, and controls from the ' +
                'FINOS SDLC Common Controls Catalog attached as data. Look at the Diagram tab, then find the control on the ' +
                '`position-store` node: only `position-service` may connect to it. The status bar already reports one ' +
                `problem. Run \`${VALIDATE_MODEL}\`. This command is meant to fail. ` +
                '`-p` is the pattern this estate enforces, `-a` the architecture, and `-u` a mapping from the CALM Hub URLs ' +
                'the model cites (the catalog\'s control requirement documents, their Standard, the node and interface ' +
                'Standards) to copies under `architecture/`, so validation needs no network. The error says the Deployment ' +
                'Gating control\'s `control-id` must equal a constant: the catalog\'s own requirement document, cited as the ' +
                'control\'s `requirement-url`, pins the id, and this file claims `SDLC-PREV-999`.',
            hint: { kind: 'commands', commands: [{ run: VALIDATE_MODEL, expect: 'failure' }] },
            check: (state) => rejected(state, { architecture: ARCHITECTURE, ...VALIDATE_FILES }),
        },
        {
            id: 'fix-control-id',
            title: 'Fix the control id',
            body:
                'In the `sdlc-prev-012-deployment-gating` control\'s `config`, change `control-id` from `SDLC-PREV-999` ' +
                `to \`${GATING_CONTROL_ID}\`, the catalog's id for Deployment Gating, and save. The status bar clears as soon ` +
                'as the saved file matches the document it cites.',
            hint: {
                kind: 'file',
                content: (files) => {
                    const doc = asItem(fileJson(files, ARCHITECTURE) ?? model());
                    controlConfig(doc, GATING_CONTROL)['control-id'] = GATING_CONTROL_ID;
                    return json(doc);
                },
            },
            check: controlIdFixed,
        },
        {
            id: 'validate-fix',
            title: 'Validate again',
            body:
                `Run \`${VALIDATE_MODEL}\` again. The summary shows 0 errors: the model is valid against CALM 1.2, the ` +
                'pattern, the node and interface Standards the pattern applies to every node, and the five catalog ' +
                'documents it cites.',
            hint: { kind: 'commands', commands: [VALIDATE_MODEL] },
            check: (state) => controlIdFixed(state) && ranOk(state, 'validate', { architecture: ARCHITECTURE, ...VALIDATE_FILES }),
        },
        {
            id: 'missing-parameter',
            title: 'A missing parameter fails on the pattern',
            body:
                '`architecture/broken/missing-parameter.json` is the same model with `repository` removed from the ' +
                'Requirements Repository control. ' +
                `Run \`${VALIDATE_MISSING_PARAMETER}\`. This command is meant to fail. ` +
                'The pattern says what this estate requires of each control, so the error names the missing property ' +
                'and the control it belongs to. The catalog document did not object: parameters are the estate\'s business.',
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
                'on every service: without it, nothing can tell which code belongs to the node. ' +
                'Three layers caught three faults: the catalog document a wrong control id, the pattern a missing ' +
                'parameter, the node Standard a missing source path. Standards define, the pattern enforces, the model complies.',
            hint: { kind: 'commands', commands: [{ run: VALIDATE_MISSING_SOURCE_PATH, expect: 'failure' }] },
            check: (state) => rejected(state, { architecture: MISSING_SOURCE_PATH, ...VALIDATE_FILES }),
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
