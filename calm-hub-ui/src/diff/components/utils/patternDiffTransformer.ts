import type { Node, Edge } from 'reactflow';
import type { DiffResult } from '@finos/calm-models/diff';
import { parsePatternData } from '@finos/calm-ui-react/visualizer/reactflow';
import { applyDiffStatus } from './applyDiffStatus.js';

export function parsePatternDataWithDiff(
    pattern: Record<string, unknown>,
    diffResult: DiffResult | null,
    isFirst: boolean,
): { nodes: Node[]; edges: Edge[] } {
    return applyDiffStatus(parsePatternData(pattern), diffResult, isFirst);
}
