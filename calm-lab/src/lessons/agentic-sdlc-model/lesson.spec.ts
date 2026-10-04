import { describe, it, expect } from 'vitest';
import {
    AGENTIC_SDLC_MODEL, ARCHITECTURE, GATING_CONTROL_ID, MAPPING, MISSING_PARAMETER, MISSING_SOURCE_PATH, PATTERN, controlConfig,
} from './lesson';
import { SEED_FILES } from './seed';
import type { CommandOutcome } from '../../cli/outcome';
import type { LessonState } from '../types';

type Item = Record<string, unknown>;
const parse = (path: string): Item => JSON.parse(AGENTIC_SDLC_MODEL.seedFiles[path]) as Item;
const VALIDATE_FILES = { pattern: PATTERN, mapping: MAPPING };
const GATING = 'sdlc-prev-012-deployment-gating';

const outcome = (over: Partial<CommandOutcome>): CommandOutcome => ({
    command: 'validate',
    files: { architecture: ARCHITECTURE, ...VALIDATE_FILES },
    ok: true,
    errorCount: 0,
    warningCount: 0,
    errorsIn: {},
    loadFailures: 0,
    snapshot: {},
    ...over,
});
const passed = (architecture: string) => outcome({ files: { architecture, ...VALIDATE_FILES } });
const rejection = (architecture: string, over: Partial<CommandOutcome> = {}) =>
    outcome({ files: { architecture, ...VALIDATE_FILES }, ok: false, errorCount: 1, errorsIn: { architecture: 1 }, ...over });

const state = (over: Partial<LessonState>): LessonState => ({
    doc: parse(ARCHITECTURE),
    validation: { ok: false },
    commands: [],
    editorFile: ARCHITECTURE,
    files: { ...AGENTIC_SDLC_MODEL.seedFiles },
    ...over,
});

/** The open file repaired by the learner: the catalog's id back on the control, optionally edited further. */
const repaired = (edit: (config: Item) => void = () => {}) => {
    const doc = parse(ARCHITECTURE);
    const config = controlConfig(doc, GATING);
    config['control-id'] = GATING_CONTROL_ID;
    edit(config);
    return JSON.stringify(doc, null, 2);
};
const withFile = (content: string) => ({ ...AGENTIC_SDLC_MODEL.seedFiles, [ARCHITECTURE]: content });
const fixed = (over: Partial<LessonState> = {}) => state({ files: withFile(repaired()), validation: { ok: true }, ...over });

describe('agentic-sdlc-model lesson', () => {
    const [validateModel, fixControlId, validateFix, missingParameter, missingSourcePath] = AGENTIC_SDLC_MODEL.steps;

    it('has five steps with unique ids and no tutorial page', () => {
        expect(AGENTIC_SDLC_MODEL.steps).toHaveLength(5);
        expect(new Set(AGENTIC_SDLC_MODEL.steps.map((step) => step.id)).size).toBe(5);
        expect(AGENTIC_SDLC_MODEL.tutorial).toBeUndefined();
        expect(AGENTIC_SDLC_MODEL.editorFile).toBe(ARCHITECTURE);
    });

    it('opens on the model with one wrong control id, and seeds two copies each wrong in one other place', () => {
        const pristine = JSON.parse(SEED_FILES[ARCHITECTURE]) as Item;
        expect(controlConfig(pristine, GATING)['control-id']).toBe(GATING_CONTROL_ID);
        expect(controlConfig(parse(ARCHITECTURE), GATING)['control-id']).toBe('SDLC-PREV-999');
        expect(controlConfig(parse(MISSING_PARAMETER), 'sdlc-prev-004-requirements-repository').repository).toBeUndefined();
        const tradeApi = (parse(MISSING_SOURCE_PATH).nodes as Item[]).find((node) => node['unique-id'] === 'trade-api')!;
        expect((tradeApi.metadata as Item)['source-path']).toBeUndefined();
        // Everything else is the pristine model: the repaired open file is it, byte for byte.
        expect(JSON.parse(repaired())).toEqual(pristine);
        for (const path of [MISSING_PARAMETER, MISSING_SOURCE_PATH]) {
            expect((parse(path).nodes as Item[]).length).toBe((pristine.nodes as Item[]).length);
            expect(controlConfig(parse(path), GATING)['control-id']).toBe(GATING_CONTROL_ID);
        }
    });

    it('validate-model passes only when the engine rejected the open file for the architecture\'s errors', () => {
        expect(validateModel.check(state({ commands: [rejection(ARCHITECTURE)] }))).toBe(true);
        expect(validateModel.check(state({ commands: [] }))).toBe(false);
        expect(validateModel.check(state({ commands: [passed(ARCHITECTURE)] }))).toBe(false);
        expect(validateModel.check(state({ commands: [rejection(MISSING_PARAMETER)] }))).toBe(false);
        // A failure caused by the pattern or by a document that did not load is not the lesson's failure.
        expect(validateModel.check(state({ commands: [rejection(ARCHITECTURE, { errorsIn: { pattern: 1 } })] }))).toBe(false);
        expect(validateModel.check(state({ commands: [rejection(ARCHITECTURE, { loadFailures: 1 })] }))).toBe(false);
    });

    it('fix-control-id needs the catalog\'s id on the saved file and a clean live validation', () => {
        expect(fixControlId.check(fixed())).toBe(true);
        expect(fixControlId.check(state({}))).toBe(false);
        expect(fixControlId.check(state({ files: withFile(repaired()), validation: { ok: false } }))).toBe(false);
        expect(fixControlId.check(fixed({ files: withFile(repaired((config) => { config['control-id'] = 'SDLC-PREV-012 '; })) }))).toBe(false);
        // A half-edited file: must not tick, must not throw.
        expect(fixControlId.check(fixed({ files: withFile(repaired().slice(0, 200)) }))).toBe(false);
    });

    it('validate-fix needs the repaired file and a fresh passing validate of it with the pattern and the mapping', () => {
        expect(validateFix.check(fixed({ commands: [passed(ARCHITECTURE)] }))).toBe(true);
        expect(validateFix.check(fixed({ commands: [] }))).toBe(false);
        expect(validateFix.check(fixed({ commands: [passed(MISSING_PARAMETER)] }))).toBe(false);
        expect(validateFix.check(state({ commands: [passed(ARCHITECTURE)] }))).toBe(false);
        expect(validateFix.check(fixed({ commands: [rejection(ARCHITECTURE)] }))).toBe(false);
        // Validated without the mapping: the hub URLs could not have resolved.
        expect(validateFix.check(fixed({ commands: [outcome({ files: { architecture: ARCHITECTURE, pattern: PATTERN } })] }))).toBe(false);
    });

    it.each([
        ['missing-parameter', missingParameter, MISSING_PARAMETER, MISSING_SOURCE_PATH],
        ['missing-source-path', missingSourcePath, MISSING_SOURCE_PATH, MISSING_PARAMETER],
    ])('%s passes only when the engine rejected its own copy for the architecture\'s errors', (_, step, file, otherFile) => {
        expect(step.check(state({ commands: [rejection(file)] }))).toBe(true);
        expect(step.check(state({ commands: [rejection(file, { errorCount: 2, errorsIn: { architecture: 2 } })] }))).toBe(true);
        expect(step.check(state({ commands: [rejection(otherFile)] }))).toBe(false);
        expect(step.check(state({ commands: [rejection(ARCHITECTURE)] }))).toBe(false);
        expect(step.check(state({ commands: [passed(file)] }))).toBe(false);
        expect(step.check(state({ commands: [rejection(file, { errorsIn: { pattern: 1 } })] }))).toBe(false);
        expect(step.check(state({ commands: [rejection(file, { loadFailures: 1 })] }))).toBe(false);
    });
});
