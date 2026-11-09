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

/** The path parameters that a resource context can give. Keep in step with DESIGNER_TAB_PARAMS in ExtensionManifestLoader. */
const TAB_PATH_PARAMETERS: ReadonlySet<string> = new Set(['namespace', 'resourceType', 'resourceId', 'version', 'selectedElement']);

/** A designer tab whose path needs a parameter that no context gives, such as {resource}, is hidden, not an error. */
export function tabContributions(extension: ExtensionSummary): ExtensionContribution[] {
    return (extension.contributes['designer-tab'] ?? []).filter((contribution) => {
        const route = extension.routes.find((entry) => entry.id === contribution.route);
        return route !== undefined && [...route.path.matchAll(/\{([^}]+)\}/g)].every(([, name]) => TAB_PATH_PARAMETERS.has(name));
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
            tabs: tabContributions(extension),
        }))
        .filter(({ actions, tabs }) => actions.length > 0 || tabs.length > 0);
}

export const screenPath = (extension: ExtensionSummary, contribution: ExtensionContribution) =>
    `/extensions/${encodeURIComponent(extension.id)}/${encodeURIComponent(contribution.id)}`;
