import { IoAppsOutline } from 'react-icons/io5';
import { ExtensionSummary } from '../model/extensions.js';
import { DiagramTab } from '../hub/components/diagram-section/tabs/diagramTabRegistry.js';
import { ExtensionSlot } from './ExtensionSlot.js';

export function extensionTabs(extensions: ExtensionSummary[]): DiagramTab[] {
    return extensions.flatMap((extension) =>
        (extension.contributes['designer-tab'] ?? []).map(
            (contribution) =>
                ({
                    id: `extension:${extension.id}:${contribution.id}`,
                    label: contribution.title,
                    icon: IoAppsOutline,
                    render: ({ data, selectedElement }) => (
                        <ExtensionSlot
                            extension={extension}
                            contribution={contribution}
                            context={{
                                namespace: data.name,
                                resource: `${data.calmType.toLowerCase()}/${data.id}`,
                                version: data.version,
                                selectedElement,
                            }}
                        />
                    ),
                }) satisfies DiagramTab
        )
    );
}
