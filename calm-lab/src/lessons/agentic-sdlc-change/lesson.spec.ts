import { describe, it, expect } from 'vitest';
import { AGENTIC_SDLC_CHANGE, BASELINE, DECLARED_RELATIONSHIP, SPEC_002 } from './lesson';
import { AGENTIC_SDLC_MODEL, ARCHITECTURE, MAPPING, PATTERN } from '../agentic-sdlc-model/lesson';
import { endFiles } from '../chain';
import { frontMatterList } from '../checks';
import type { CommandOutcome } from '../../cli/outcome';
import type { LessonState } from '../types';

type Item = Record<string, unknown>;
const seed = AGENTIC_SDLC_CHANGE.seedFiles;
const baseline = (): Item => JSON.parse(seed[ARCHITECTURE]) as Item;

/** The learner's own ids for the relationships and the interface: other names than the hints use. */
const connects = (id: string, source: string, destination: string, iface?: string): Item => ({
    'unique-id': id,
    'relationship-type': { connects: { source: { node: source }, destination: { node: destination, ...(iface ? { interfaces: [iface] } : {}) } } },
});
const withRelationships = (doc: Item, ...added: Item[]): Item => ({ ...doc, relationships: [...(doc.relationships as Item[]), ...added] });
const withInterface = (doc: Item, nodeId: string, iface: Item): Item => ({
    ...doc,
    nodes: (doc.nodes as Item[]).map((node) => (node['unique-id'] === nodeId
        ? { ...node, interfaces: [...((node.interfaces as Item[] | undefined) ?? []), iface] }
        : node)),
});
const SHORTCUT = connects('ta-reads-positions', 'trade-api', 'position-store', 'position-store-file');
const DECLARED = connects('reconciliation-reads-trades', 'position-service', 'trade-api', 'trades-http');
const BINDING = { 'unique-id': 'trades-http', protocol: 'HTTP', 'env-binding': 'TRADE_API_URL' };
const shortcutDoc = () => withRelationships(baseline(), SHORTCUT);
const changedDoc = () => withRelationships(withInterface(baseline(), 'trade-api', BINDING), DECLARED);

const validateRun = (over: Partial<CommandOutcome> = {}): CommandOutcome => ({
    command: 'validate', files: { architecture: ARCHITECTURE, pattern: PATTERN, mapping: MAPPING }, ok: true, errorCount: 0, warningCount: 0,
    errorsIn: {}, loadFailures: 0, snapshot: {}, ...over,
});
const diffRun = (over: Partial<CommandOutcome> = {}): CommandOutcome => ({
    command: 'diff', files: { documentA: BASELINE, documentB: ARCHITECTURE }, ok: true, errorCount: 0, warningCount: 0, snapshot: {}, ...over,
});

const state = (over: Partial<LessonState>): LessonState => ({
    doc: baseline(),
    validation: { ok: true },
    commands: [],
    editorFile: ARCHITECTURE,
    files: { ...seed },
    ...over,
});
const specWith = (frontMatterLine: string) => ({ ...seed, [SPEC_002]: seed[SPEC_002].replace('model-change: []', frontMatterLine) });

describe('agentic-sdlc-change lesson', () => {
    const [shortcut, stillValid, undeclared, declare, modelChange, validateAndDiff] = AGENTIC_SDLC_CHANGE.steps;

    it('has six steps with unique ids and no tutorial page', () => {
        expect(AGENTIC_SDLC_CHANGE.steps).toHaveLength(6);
        expect(new Set(AGENTIC_SDLC_CHANGE.steps.map((step) => step.id)).size).toBe(6);
        expect(AGENTIC_SDLC_CHANGE.tutorial).toBeUndefined();
        expect(AGENTIC_SDLC_CHANGE.editableFiles).toEqual([ARCHITECTURE, SPEC_002]);
    });

    it('chains from agentic-sdlc-model, and seeds the baseline and a SPEC-002 that declares nothing yet', () => {
        expect(AGENTIC_SDLC_CHANGE.chainsFrom).toBe(AGENTIC_SDLC_MODEL.id);
        for (const [path, content] of Object.entries(endFiles(AGENTIC_SDLC_MODEL))) {
            expect(seed[path], path).toBe(content);
        }
        expect(seed[BASELINE]).toBe(seed[ARCHITECTURE]);
        expect(frontMatterList(seed[SPEC_002], 'model-change')).toEqual([]);
        expect(frontMatterList(seed[SPEC_002], 'calm-relationships')).toEqual([DECLARED_RELATIONSHIP]);
    });

    it('shortcut accepts any connects relationship from trade-api to position-store', () => {
        expect(shortcut.check(state({ doc: shortcutDoc() }))).toBe(true);
        expect(shortcut.check(state({}))).toBe(false);
        expect(shortcut.check(state({ doc: withRelationships(baseline(), connects('reversed', 'position-store', 'trade-api')) }))).toBe(false);
        expect(shortcut.check(state({ doc: shortcutDoc(), validation: { ok: false } }))).toBe(false);
        expect(shortcut.check(state({ doc: null }))).toBe(false);
    });

    it('still-valid needs the shortcut and a fresh passing validate of the model', () => {
        expect(stillValid.check(state({ doc: shortcutDoc(), commands: [validateRun()] }))).toBe(true);
        expect(stillValid.check(state({ doc: shortcutDoc() }))).toBe(false);
        expect(stillValid.check(state({ commands: [validateRun()] }))).toBe(false);
        expect(stillValid.check(state({ doc: shortcutDoc(), commands: [validateRun({ ok: false, errorCount: 1, errorsIn: { architecture: 1 } })] }))).toBe(false);
    });

    it('undeclared needs the shortcut and a diff of the baseline against the model', () => {
        expect(undeclared.check(state({ doc: shortcutDoc(), commands: [diffRun()] }))).toBe(true);
        expect(undeclared.check(state({ doc: shortcutDoc() }))).toBe(false);
        expect(undeclared.check(state({ commands: [diffRun()] }))).toBe(false);
        expect(undeclared.check(state({ doc: shortcutDoc(), commands: [diffRun({ files: { documentA: ARCHITECTURE, documentB: BASELINE } })] }))).toBe(false);
        expect(undeclared.check(state({ doc: shortcutDoc(), commands: [diffRun({ ok: false })] }))).toBe(false);
    });

    it('declare accepts the relationship anywhere in the model-change list, in any order or quoting', () => {
        expect(declare.check(state({ files: specWith('model-change: ["position-service-to-trade-api", trade-api]') }))).toBe(true);
        expect(declare.check(state({ files: specWith('model-change: [position-service-to-trade-api]') }))).toBe(true);
        expect(declare.check(state({}))).toBe(false);
        expect(declare.check(state({ files: specWith('model-change: [trade-api]') }))).toBe(false);
        // Named only where it already was, not as a model change.
        expect(declare.check(state({ files: specWith('model-change: []\ncalm-relationships: [position-service-to-trade-api]') }))).toBe(false);
        expect(declare.check(state({ files: { ...seed, [SPEC_002]: '---\nid: SPEC-002\nmodel-change: [position-service' } }))).toBe(false);
    });

    it('model-change needs the declared relationship and binding, and no shortcut', () => {
        expect(modelChange.check(state({ doc: changedDoc() }))).toBe(true);
        expect(modelChange.check(state({}))).toBe(false);
        expect(modelChange.check(state({ doc: withRelationships(changedDoc(), SHORTCUT) }))).toBe(false);
        expect(modelChange.check(state({ doc: withRelationships(baseline(), DECLARED) }))).toBe(false);
        expect(modelChange.check(state({ doc: withRelationships(withInterface(baseline(), 'position-service', BINDING), DECLARED) }))).toBe(false);
        expect(modelChange.check(state({ doc: changedDoc(), validation: { ok: false } }))).toBe(false);
    });

    it('validate-and-diff needs the change, a fresh validate and a fresh diff', () => {
        expect(validateAndDiff.check(state({ doc: changedDoc(), commands: [validateRun(), diffRun()] }))).toBe(true);
        expect(validateAndDiff.check(state({ doc: changedDoc(), commands: [validateRun()] }))).toBe(false);
        expect(validateAndDiff.check(state({ doc: changedDoc(), commands: [diffRun()] }))).toBe(false);
        expect(validateAndDiff.check(state({ doc: shortcutDoc(), commands: [validateRun(), diffRun()] }))).toBe(false);
    });
});
