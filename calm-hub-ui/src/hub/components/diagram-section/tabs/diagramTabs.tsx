import { IoAppsOutline, IoCodeOutline, IoEyeOutline, IoGitNetworkOutline, IoPricetagsOutline } from 'react-icons/io5';
import { ExtensionsTabPanel } from '../../../../extensions/sections/ExtensionsTabPanel.js';
import { JsonRenderer } from '../../json-renderer/JsonRenderer.js';
import { DecoratorsPanel } from '../decorators/DecoratorsPanel.js';
import { UsedByPanel } from '../used-by/UsedByPanel.js';
import { USED_BY_TOOLTIP, usedByLabel } from '../used-by/usedBy.js';
import { DEFAULT_DIAGRAM_TAB_ID, type DiagramTab } from './diagramTabRegistry.js';
import type { Data } from '../../../../model/calm.js';
import type { ExtensionContext } from '../../../../model/extensions.js';

/** The `?tab=decorators` query parameter that filters by decorator type. */
export const DECORATOR_TYPE_PARAM = 'type';

/** Old `?tab=` values, and the query that replaces each. Deployments became a decorator view. */
export const DIAGRAM_TAB_REDIRECTS: Readonly<Record<string, Record<string, string>>> = {
    deployments: { tab: 'decorators', [DECORATOR_TYPE_PARAM]: 'deployment' },
};

export const EXTENSIONS_TAB_ID = 'extensions';

export const extensionContext = (data: Data, selectedElement?: string): ExtensionContext => ({
    namespace: data.name,
    resource: `${data.calmType.toLowerCase()}/${data.id}`,
    version: data.version,
    selectedElement,
});

/** The tabs of the diagram section, in display order. */
export const DIAGRAM_TABS: readonly DiagramTab[] = [
    {
        id: DEFAULT_DIAGRAM_TAB_ID,
        label: 'Diagram',
        icon: IoEyeOutline,
        render: ({ diagram }) => <div className="w-full h-full">{diagram}</div>,
    },
    {
        id: 'json',
        label: 'JSON',
        icon: IoCodeOutline,
        render: ({ data }) => (
            <div className="h-full bg-base-200 overflow-auto">
                <JsonRenderer json={data} />
            </div>
        ),
    },
    {
        id: 'decorators',
        label: 'Decorators',
        icon: IoPricetagsOutline,
        isVisible: ({ isArchitecture }) => isArchitecture,
        searchParams: [DECORATOR_TYPE_PARAM],
        render: ({ decorators, searchParams, setTabParams }) => (
            <DecoratorsPanel
                state={decorators}
                typeFilter={searchParams.get(DECORATOR_TYPE_PARAM) || null}
                onTypeFilterChange={(type) => setTabParams(type ? { [DECORATOR_TYPE_PARAM]: type } : {})}
            />
        ),
    },
    {
        id: 'used-by',
        label: ({ usedBy }) => usedByLabel(usedBy),
        title: USED_BY_TOOLTIP,
        icon: IoGitNetworkOutline,
        isVisible: ({ isArchitecture, patternName }) => !isArchitecture && patternName !== undefined,
        render: ({ usedBy }) => <UsedByPanel state={usedBy} />,
    },
    {
        id: EXTENSIONS_TAB_ID,
        label: 'Extensions',
        icon: IoAppsOutline,
        // Hidden, not unknown, until the registry loads, so a link to the tab keeps it.
        isVisible: ({ hasExtensions }) => !!hasExtensions,
        render: ({ data, selectedElement }) => <ExtensionsTabPanel context={extensionContext(data, selectedElement)} />,
    },
];
