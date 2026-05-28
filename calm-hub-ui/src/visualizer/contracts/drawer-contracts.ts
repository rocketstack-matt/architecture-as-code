/**
 * Hub-local contract types that depend on the Hub UI Data model (which is
 * route-shaped and not part of the shared @finos/calm-ui-react package).
 */
import type { Data } from '../../model/calm.js';
import type {
    SelectedItem,
    Decorator,
} from '@finos/calm-ui-react/visualizer/contracts';

/** Props for the Hub UI Drawer component. */
export interface DrawerProps {
    data?: Data;
    onItemSelect?: (item: SelectedItem) => void;
    decorators?: Decorator[];
}

/** Route parameters used by Hub UI URL handlers. */
export type HubParams = {
    namespace?: string;
    type?: 'Architectures' | 'Patterns' | 'Flows' | 'ADRs';
    id?: string;
    version?: string;
};
