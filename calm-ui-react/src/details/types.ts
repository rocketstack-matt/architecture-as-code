import type { CalmNodeSchema, CalmRelationshipSchema } from '@finos/calm-models/types'

/** AIGF risk item — all fields optional as CALM data may have partial info. */
export interface RiskItem {
    id?: string
    name?: string
    description?: string
}

/** AIGF mitigation item — all fields optional as CALM data may have partial info. */
export interface MitigationItem {
    id?: string
    name?: string
    description?: string
}

/** Control item — flexible structure to accommodate various control types. */
export interface ControlItem {
    description?: string
    [key: string]: unknown
}

/** Props for the Sidebar component. */
export interface SidebarProps {
    selectedData: CalmNodeSchema | CalmRelationshipSchema
    closeSidebar: () => void
}
