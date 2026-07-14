import { type IconType } from 'react-icons';
import {
    IoDocumentTextOutline,
    IoGitBranchOutline,
    IoGitCommitOutline,
    IoLinkOutline,
    IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { colors } from './colors.js';
import { type TypeInUI } from '../hub/components/tree-navigation/navigation-loaders.js';
import { NamespaceCounts } from '../model/counts.js';
import { type GroupedSearchResults } from '../model/search.js';

/**
 * The resource types shown on the namespace browse page: every UI type except
 * `Controls` (a control-domain concept, not a namespace browse type). Derived from
 * `TypeInUI` so a new browsable type can't silently miss a tab — adding one to
 * `TypeInUI` makes this union (and the `Record`s keyed on it) require it.
 *
 * Only the browse-tab machinery (`NAMESPACE_RESOURCE_TYPES`, `COUNT_FIELD`,
 * `SegmentedTypeTabs`) keys on this narrow union, so widening the card surface below
 * never grows the tab set.
 */
export type NamespaceResourceType = Exclude<TypeInUI, 'Controls'>;

/**
 * The resource types a browse *card* (and its {@link TypeBadge} / thumbnail colours)
 * can represent — the browse types plus `Controls`. Controls reuse the shared card
 * anatomy in the control-domain grid but are deliberately absent from the namespace
 * tabs; this superset lets ItemCard/TypeBadge/`getResourceType*` accept a control
 * without leaking a `Controls` tab into {@link NamespaceResourceType}. Equal to
 * `TypeInUI` today; named for intent.
 */
export type CardResourceType = NamespaceResourceType | 'Controls';

type ResourceTypeKey = keyof typeof colors.resourceTypes;

interface ResourceTypeMeta {
    /** Singular label used on badges (e.g. "Architecture"). */
    label: string;
    /**
     * Plural label used in running copy (e.g. empty-state messages). Held
     * explicitly rather than appending "s" to {@link label} so acronyms read
     * correctly ("ADRs", not "adrs").
     */
    pluralLabel: string;
    /** Key into `colors.resourceTypes` for the accent / tint pair. */
    colorKey: ResourceTypeKey;
    /**
     * Type glyph shown on card thumbnails and search group headers. Only the
     * non-visual types carry one; Architectures and Patterns are deliberately
     * absent — they keep the plain striped placeholder until they get real
     * diagram thumbnails.
     */
    icon?: IconType;
}

/**
 * Maps a (plural) UI resource type to its display metadata: the singular badge
 * label and the `colors.resourceTypes` key for its accent + tint. Centralised so
 * TypeBadge, ItemCard thumbnails and the type tabs all derive colour and label
 * from one place rather than re-deriving the plural→singular / colour mapping.
 *
 * Keyed on {@link CardResourceType}, so `Controls` is included for the shared browse
 * card (its "Control" pill + blue thumbnail) even though it is not a namespace tab —
 * the tab exports below stay narrowed to {@link NamespaceResourceType}. Indexed only
 * (`RESOURCE_TYPE_META[type]`), never enumerated, so the `Controls` row can't leak
 * into any tab list.
 */
const RESOURCE_TYPE_META: Record<CardResourceType, ResourceTypeMeta> = {
    Architectures: { label: 'Architecture', pluralLabel: 'architectures', colorKey: 'architecture' },
    Patterns: { label: 'Pattern', pluralLabel: 'patterns', colorKey: 'pattern' },
    Flows: { label: 'Flow', pluralLabel: 'flows', colorKey: 'flow', icon: IoGitBranchOutline },
    Standards: { label: 'Standard', pluralLabel: 'standards', colorKey: 'standard', icon: IoDocumentTextOutline },
    ADRs: { label: 'ADR', pluralLabel: 'ADRs', colorKey: 'adr', icon: IoGitCommitOutline },
    Interfaces: { label: 'Interface', pluralLabel: 'interfaces', colorKey: 'interface', icon: IoLinkOutline },
    Controls: { label: 'Control', pluralLabel: 'controls', colorKey: 'control', icon: IoShieldCheckmarkOutline },
};

/**
 * Maps each browse type to its field on the namespace counts payload. A `Record`
 * (not a hand switch) so a new `NamespaceResourceType` fails to compile until its
 * count field is wired — shared by the desktop tabs and the mobile drill-down.
 */
export const COUNT_FIELD: Record<NamespaceResourceType, keyof NamespaceCounts> = {
    Architectures: 'architectures',
    Patterns: 'patterns',
    Flows: 'flows',
    Standards: 'standards',
    ADRs: 'adrs',
    Interfaces: 'interfaces',
};

/** Stable DOM id for a type tab button — referenced by the panel's `aria-labelledby`. */
export const tabId = (type: NamespaceResourceType) => `type-tab-${type}`;

/** Stable DOM id for the grid panel the type tabs control (their `aria-controls`). */
export const TYPE_PANEL_ID = 'namespace-type-panel';

/** The browse types in the order the tabs (and grid) present them. */
export const NAMESPACE_RESOURCE_TYPES: NamespaceResourceType[] = [
    'Architectures',
    'Patterns',
    'Flows',
    'Standards',
    'ADRs',
    'Interfaces',
];

export function getResourceTypeMeta(type: CardResourceType): ResourceTypeMeta {
    return RESOURCE_TYPE_META[type];
}

/**
 * The colours for a browse (or control) card resource type. `accent` is the fill /
 * border / stripe value; `accentText` is the same colour in a text or icon role,
 * which lightens under dark to stay legible on `tint`.
 */
export function getResourceTypeColors(type: CardResourceType): {
    accent: string;
    accentText: string;
    tint: string;
} {
    return colors.resourceTypes[RESOURCE_TYPE_META[type].colorKey];
}

/**
 * The type glyph for a browse (or control) card resource type, or `undefined`
 * for the visual types (Architectures / Patterns) that keep a plain thumbnail.
 */
export function getResourceTypeIcon(type: CardResourceType): IconType | undefined {
    return RESOURCE_TYPE_META[type].icon;
}

/**
 * Maps a lowercase search group key (the `GroupedSearchResults` / `TYPE_LABELS`
 * key, e.g. `'flows'`, `'adrs'`) back to its {@link CardResourceType}, so the
 * search surfaces can pull the type icon from this registry rather than keeping
 * their own copy of the mapping. Keyed on `keyof GroupedSearchResults`, so a new
 * backend group fails to compile here instead of silently rendering icon-less.
 */
const SEARCH_GROUP_TYPE: Record<keyof GroupedSearchResults, CardResourceType> = {
    architectures: 'Architectures',
    patterns: 'Patterns',
    flows: 'Flows',
    standards: 'Standards',
    adrs: 'ADRs',
    interfaces: 'Interfaces',
    controls: 'Controls',
};

/**
 * The type glyph for a search result group header, keyed by the lowercase
 * group key. `undefined` for unknown keys and for the icon-less visual types,
 * whose headers render label-only.
 */
export function getSearchGroupIcon(groupKey: string): IconType | undefined {
    // Callers hold plain-string keys (Object.entries); unknown keys miss the
    // map and fall out as undefined at runtime, hence the narrowing cast.
    const type: CardResourceType | undefined = SEARCH_GROUP_TYPE[groupKey as keyof GroupedSearchResults];
    return type === undefined ? undefined : RESOURCE_TYPE_META[type].icon;
}
