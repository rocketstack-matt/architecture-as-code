/**
 * `ControlDetail` re-exported from @finos/calm-hub-client. `ControlData` stays
 * here — it's the Hub UI page-state shape (the data passed to the control
 * detail route) which the shared client doesn't model.
 */
export type { ControlDetail } from '@finos/calm-hub-client';

/**
 * Represents the data loaded when a user selects a control in the tree.
 */
export interface ControlData {
    domain: string;
    controlId: number;
    controlName: string;
    controlDescription: string;
}
