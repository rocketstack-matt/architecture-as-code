import { describe, it, expect } from 'vitest';
import { createVfs } from '../lab/vfs';
import { validateArchitecture } from '../engine';
import { editorSchemaDirectory } from './mapping';
import { HOME_DIR } from './types';

const STANDARD_URL = 'https://standards.acme.test/node.json';
const NODE_REF = 'https://calm.finos.org/release/1.2/meta/core.json#/defs/node';
const STANDARD = JSON.stringify({ $id: STANDARD_URL, allOf: [{ $ref: NODE_REF }, { type: 'object', required: ['team'] }] });
const MAPPING = `${HOME_DIR}/url-mapping.json`;

/** A control whose requirement document is only reachable through the mapping. */
const REQUIREMENT_URL = 'https://hub.acme.test/calm/domains/acme/controls/review/requirement/versions/1.0.0';
const REQUIREMENT = JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: REQUIREMENT_URL,
    type: 'object',
    properties: { 'control-id': { const: 'ACME-001' }, name: { type: 'string' }, description: { type: 'string' } },
    required: ['control-id', 'name', 'description'],
});
const architecture = (controlId: string) => JSON.stringify({
    $schema: 'https://calm.finos.org/release/1.2/meta/calm.json',
    nodes: [{ 'unique-id': 'orders-api', 'node-type': 'service', name: 'Orders API', description: 'orders' }],
    relationships: [],
    controls: {
        review: {
            description: 'Code review.',
            requirements: [{ 'requirement-url': REQUIREMENT_URL, config: { 'control-id': controlId, name: 'Review', description: 'how' } }],
        },
    },
});

const vfs = (mapping: Record<string, string> | string) => createVfs({
    [`${HOME_DIR}/standards/node.json`]: STANDARD,
    [`${HOME_DIR}/hub/review.json`]: REQUIREMENT,
    [MAPPING]: typeof mapping === 'string' ? mapping : JSON.stringify(mapping),
}, null);

describe('editorSchemaDirectory', () => {
    it('is undefined for a lesson without a mapping, or whose mapping file is missing or not JSON', async () => {
        expect(await editorSchemaDirectory(vfs({}), {})).toBeUndefined();
        expect(await editorSchemaDirectory(vfs({}), { urlMapping: `${HOME_DIR}/missing.json` })).toBeUndefined();
        expect(await editorSchemaDirectory(vfs('{'), { urlMapping: MAPPING })).toBeUndefined();
    });

    it('resolves a mapped URL the way calm validate -u does', async () => {
        const directory = await editorSchemaDirectory(vfs({ [STANDARD_URL]: 'standards/node.json' }), { urlMapping: MAPPING });
        expect(directory).toBeDefined();
        expect(await directory!.getSchema(STANDARD_URL)).toMatchObject({ $id: STANDARD_URL });
    });

    it('lets the editor validate a control config against a requirement document the mapping serves', async () => {
        const directory = await editorSchemaDirectory(vfs({ [REQUIREMENT_URL]: 'hub/review.json' }), { urlMapping: MAPPING });
        expect((await validateArchitecture(architecture('ACME-001'), directory)).ok).toBe(true);
        const wrong = await validateArchitecture(architecture('ACME-999'), directory);
        expect(wrong.ok).toBe(false);
        expect(wrong.errors.some((issue) => /constant/.test(issue.message))).toBe(true);
        // Without the mapping the document cannot load, so the same file does not validate.
        expect((await validateArchitecture(architecture('ACME-001'))).ok).toBe(false);
    });
});
