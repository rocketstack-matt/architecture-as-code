import { describe, it, expect } from 'vitest';
import {
    AGENTIC_SDLC_MODEL, ARCHITECTURE, MAPPING, MISSING_PARAMETER, MISSING_SOURCE_PATH, PATTERN, WRONG_CONTROL_ID, controlConfig,
} from './lesson';
import type { CommandOutcome } from '../../cli/outcome';
import type { LessonState } from '../types';

type Item = Record<string, unknown>;
const parse = (path: string): Item => JSON.parse(AGENTIC_SDLC_MODEL.seedFiles[path]) as Item;
const VALIDATE_FILES = { pattern: PATTERN, mapping: MAPPING };

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
    validation: { ok: true },
    commands: [],
    editorFile: ARCHITECTURE,
    files: { ...AGENTIC_SDLC_MODEL.seedFiles },
    ...over,
});

/** The broken file repaired by the learner, with a repository path other than the hint's. */
const repaired = (edit: (config: Item) => void = () => {}) => {
    const doc = parse(MISSING_PARAMETER);
    const config = controlConfig(doc, 'sdlc-prev-004-requirements-repository');
    config.repository = 'requirements/';
    edit(config);
    return JSON.stringify(doc, null, 2);
};
const withFile = (content: string) => ({ ...AGENTIC_SDLC_MODEL.seedFiles, [MISSING_PARAMETER]: content });

describe('agentic-sdlc-model lesson', () => {
    const [validateModel, missingParameter, missingSourcePath, wrongControlId, fixParameter, validateFix] = AGENTIC_SDLC_MODEL.steps;

    it('has six steps with unique ids and no tutorial page', () => {
        expect(AGENTIC_SDLC_MODEL.steps).toHaveLength(6);
        expect(new Set(AGENTIC_SDLC_MODEL.steps.map((step) => step.id)).size).toBe(6);
        expect(AGENTIC_SDLC_MODEL.tutorial).toBeUndefined();
        expect(AGENTIC_SDLC_MODEL.editableFiles).toEqual([ARCHITECTURE, MISSING_PARAMETER]);
    });

    it('seeds the model and three copies that are each wrong in one place', () => {
        const model = parse(ARCHITECTURE);
        expect(controlConfig(model, 'sdlc-prev-004-requirements-repository').repository).toBe('specs/');
        expect(controlConfig(parse(MISSING_PARAMETER), 'sdlc-prev-004-requirements-repository').repository).toBeUndefined();
        const tradeApi = (parse(MISSING_SOURCE_PATH).nodes as Item[]).find((node) => node['unique-id'] === 'trade-api')!;
        expect((tradeApi.metadata as Item)['source-path']).toBeUndefined();
        expect(controlConfig(parse(WRONG_CONTROL_ID), 'sdlc-prev-012-deployment-gating')['control-id']).toBe('SDLC-PREV-999');
        // Everything else is the model.
        for (const path of [MISSING_PARAMETER, MISSING_SOURCE_PATH, WRONG_CONTROL_ID]) {
            expect((parse(path).nodes as Item[]).length).toBe((model.nodes as Item[]).length);
        }
    });

    it('validate-model passes only on a fresh, successful validate of the model with the pattern and the mapping', () => {
        expect(validateModel.check(state({ commands: [passed(ARCHITECTURE)] }))).toBe(true);
        expect(validateModel.check(state({ commands: [] }))).toBe(false);
        expect(validateModel.check(state({ commands: [passed(MISSING_PARAMETER)] }))).toBe(false);
        expect(validateModel.check(state({ commands: [rejection(ARCHITECTURE)] }))).toBe(false);
        // Validated without the mapping: the hub URLs could not have resolved.
        expect(validateModel.check(state({ commands: [outcome({ files: { architecture: ARCHITECTURE, pattern: PATTERN } })] }))).toBe(false);
    });

    it.each([
        ['missing-parameter', missingParameter, MISSING_PARAMETER, MISSING_SOURCE_PATH],
        ['missing-source-path', missingSourcePath, MISSING_SOURCE_PATH, WRONG_CONTROL_ID],
        ['wrong-control-id', wrongControlId, WRONG_CONTROL_ID, MISSING_PARAMETER],
    ])('%s passes only when the engine rejected its own file for the architecture\'s errors', (_, step, file, otherFile) => {
        expect(step.check(state({ commands: [rejection(file)] }))).toBe(true);
        expect(step.check(state({ commands: [rejection(file, { errorCount: 2, errorsIn: { architecture: 2 } })] }))).toBe(true);
        expect(step.check(state({ commands: [rejection(otherFile)] }))).toBe(false);
        expect(step.check(state({ commands: [passed(file)] }))).toBe(false);
        // A failure caused by the pattern or by a document that did not load is not the lesson's failure.
        expect(step.check(state({ commands: [rejection(file, { errorsIn: { pattern: 1 } })] }))).toBe(false);
        expect(step.check(state({ commands: [rejection(file, { loadFailures: 1 })] }))).toBe(false);
    });

    it('fix-parameter accepts any repository path next to the audit trail', () => {
        expect(fixParameter.check(state({ files: withFile(repaired()) }))).toBe(true);
        expect(fixParameter.check(state({}))).toBe(false);
        expect(fixParameter.check(state({ files: withFile(repaired((config) => { config.repository = '  '; })) }))).toBe(false);
        expect(fixParameter.check(state({ files: withFile(repaired((config) => { delete config['audit-trail']; })) }))).toBe(false);
        expect(fixParameter.check(state({ files: withFile(repaired((config) => { config.repository = 42; })) }))).toBe(false);
        // A half-edited file: must not tick, must not throw.
        expect(fixParameter.check(state({ files: withFile(repaired().slice(0, 200)) }))).toBe(false);
    });

    it('validate-fix needs the repaired file and a fresh passing validate of it', () => {
        expect(validateFix.check(state({ files: withFile(repaired()), commands: [passed(MISSING_PARAMETER)] }))).toBe(true);
        expect(validateFix.check(state({ files: withFile(repaired()), commands: [] }))).toBe(false);
        expect(validateFix.check(state({ files: withFile(repaired()), commands: [passed(ARCHITECTURE)] }))).toBe(false);
        expect(validateFix.check(state({ commands: [passed(MISSING_PARAMETER)] }))).toBe(false);
        expect(validateFix.check(state({ files: withFile(repaired()), commands: [rejection(MISSING_PARAMETER)] }))).toBe(false);
    });
});
