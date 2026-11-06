import { ExtensionContext, ExtensionContribution, ExtensionSummary } from '../model/extensions.js';
import { extensionRequest } from '../service/extension-service.js';

/** The actions that can run for this context: a path parameter the context does not give hides the action. */
export function actionContributions(extension: ExtensionSummary, context: ExtensionContext): ExtensionContribution[] {
    return (extension.contributes.action ?? []).filter((contribution) => {
        const route = extension.routes.find((entry) => entry.id === contribution.route);
        if (!route) return false;
        try {
            extensionRequest(extension.id, route, context);
            return true;
        } catch {
            return false;
        }
    });
}

export interface ResourceExtension {
    extension: ExtensionSummary;
    actions: ExtensionContribution[];
    tabs: ExtensionContribution[];
}

/** The extensions that show in a resource's Extensions tab: each with an action or a designer tab for it. */
export function resourceExtensions(extensions: readonly ExtensionSummary[], context: ExtensionContext): ResourceExtension[] {
    return extensions
        .map((extension) => ({
            extension,
            actions: actionContributions(extension, context),
            tabs: extension.contributes['designer-tab'] ?? [],
        }))
        .filter(({ actions, tabs }) => actions.length > 0 || tabs.length > 0);
}

export const screenPath = (extension: ExtensionSummary, contribution: ExtensionContribution) =>
    `/extensions/${encodeURIComponent(extension.id)}/${encodeURIComponent(contribution.id)}`;
