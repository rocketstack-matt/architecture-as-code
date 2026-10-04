import type { SchemaDirectory } from '@finos/calm-shared/browser';
import type { Vfs } from '../lab/vfs';
import { readUrlMapping, refLoaders } from '../cli/files';
import { schemaDirectoryWith } from '../engine';
import { HOME_DIR, type Lesson } from './types';

/**
 * The schema directory the editor's live validation uses for a lesson: the lesson's URL mapping first,
 * then the bundled meta-schemas, as `calm validate -u` builds it, so an editor file that cites URLs the
 * mapping resolves (a control's `requirement-url`, a Standard) validates the way the command does.
 * Undefined when the lesson has no mapping or its mapping file cannot be read, which leaves the session
 * default in charge.
 */
export async function editorSchemaDirectory(vfs: Vfs, lesson: Pick<Lesson, 'urlMapping'>): Promise<SchemaDirectory | undefined> {
    if (!lesson.urlMapping) {
        return undefined;
    }
    const mapping = readUrlMapping({ vfs, getCwd: () => HOME_DIR, setCwd: () => undefined }, lesson.urlMapping);
    if ('error' in mapping) {
        return undefined;
    }
    const refs = refLoaders(mapping);
    return schemaDirectoryWith(refs.first, refs.last);
}
