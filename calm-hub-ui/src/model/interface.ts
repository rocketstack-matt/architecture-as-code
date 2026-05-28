/**
 * `InterfaceDetail` re-exported from @finos/calm-hub-client. `InterfaceData`
 * stays here — it's the Hub UI page-state shape for the interface detail
 * route.
 */
export type { InterfaceDetail } from '@finos/calm-hub-client';

/**
 * Represents the data loaded when a user selects an interface in the tree.
 */
export interface InterfaceData {
    namespace: string;
    interfaceId: number;
    interfaceName: string;
    interfaceDescription: string;
}
