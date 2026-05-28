import { CalmInterfaceSchema, CalmControlsSchema } from '@finos/calm-models/types';

//These types and interfaces represent node data, and are also used in the custom node.

/**
 * Data structure for node details displayed in the Sidebar
 * Compatible with CalmNodeSchema data passed from ReactFlow
 */
export type NodeData = {
    id: string;
    description?: string;
    type: string;
    name?: string;
    interfaces?: CalmInterfaceSchema[];
    controls?: CalmControlsSchema;
    [key: string]: unknown;
};

// AIGF risk, mitigation, and control item types are co-located with the
// Sidebar component in `../../details/types.ts`. Re-exported here so the
// visualizer contracts barrel continues to surface them.
export type {
    RiskItem,
    MitigationItem,
    ControlItem,
} from '../../details/types.js';
