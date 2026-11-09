import { ExtensionContext, ExtensionContribution, ExtensionSummary } from '../model/extensions.js';
import { extensionRequest } from '../service/extension-service.js';

function canFill(extension: ExtensionSummary, contribution: ExtensionContribution, context: ExtensionContext): boolean {
    const route = extension.routes.find((entry) => entry.id === contribution.route);
    if (!route) return false;
    try {
        extensionRequest(extension.id, route, context);
        return true;
    } catch {
        return false;
    }
}

/** The actions that can run for this context: a path parameter the context does not give hides the action. */
export function actionContributions(extension: ExtensionSummary, context: ExtensionContext): ExtensionContribution[] {
    return (extension.contributes.action ?? []).filter((contribution) => canFill(extension, contribution, context));
}

/** The actions that wait for a selected element: none is selected, or the path rule refuses the selected id. */
export function selectionActions(extension: ExtensionSummary, context: ExtensionContext): ExtensionContribution[] {
    const selected = { ...context, selectedElement: 'selected-element' };
    return (extension.contributes.action ?? []).filter(
        (contribution) => !canFill(extension, contribution, context) && canFill(extension, contribution, selected)
    );
}

export interface ResourceExtension {
    extension: ExtensionSummary;
    actions: ExtensionContribution[];
    /** Actions that wait for a selected element. They keep the extension listed, so a change of selection does not hide the tab. */
    needsSelection: ExtensionContribution[];
    tabs: ExtensionContribution[];
}

/** The extensions that show in a resource's Extensions tab: each with an action or a designer tab for it. */
export function resourceExtensions(extensions: readonly ExtensionSummary[], context: ExtensionContext): ResourceExtension[] {
    return extensions
        .map((extension) => ({
            extension,
            actions: actionContributions(extension, context),
            needsSelection: selectionActions(extension, context),
            tabs: extension.contributes['designer-tab'] ?? [],
        }))
        .filter(({ actions, needsSelection, tabs }) => actions.length + needsSelection.length + tabs.length > 0);
}

export const screenPath = (extension: ExtensionSummary, contribution: ExtensionContribution) =>
    `/extensions/${encodeURIComponent(extension.id)}/${encodeURIComponent(contribution.id)}`;
