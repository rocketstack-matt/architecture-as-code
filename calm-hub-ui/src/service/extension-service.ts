import axios, { AxiosInstance, isAxiosError } from 'axios';
import { getAuthHeaders } from '../authService.js';
import { isBuiltInExtension } from '../extensions/extensionIdentity.js';
import { ExtensionContext, ExtensionRoute, ExtensionSummary } from '../model/extensions.js';
import type { DecoratorView } from '../visualizer/contracts/contracts.js';
import { authStore } from './utils/auth-store.js';

/** The extension contract version this UI reads. The registry and each blocks reply give theirs. */
export const SUPPORTED_HUB_API = 0;

type RegistryEntry = ExtensionSummary & { contributes?: { 'decorator-views'?: DecoratorView[] } };

/** A failed registry load. `signedOut` is true for a 401, which opens the sign-in prompt. */
export class ExtensionRegistryError extends Error {
    constructor(message: string, readonly signedOut: boolean) {
        super(message);
    }
}

const isSignedOut = (error: unknown) => isAxiosError(error) && error.response?.status === 401;

// Hub refuses these parts of a path (ADR 0011). The same rule as @finos/calm-shared buildExtensionRequest.
function isPathValue(value: string): boolean {
    // eslint-disable-next-line no-control-regex
    return value !== '' && value !== '.' && !/\.\.|[/\\%@\u0000-\u001f\u007f]/.test(value);
}

export function extensionRequest(id: string, route: ExtensionRoute, context: ExtensionContext) {
    const values: Record<string, string | undefined> = { ...context };
    const path = route.path.replace(/\{([^}]+)\}/g, (_, key: string) => {
        const value = values[key];
        if (typeof value !== 'string') throw new Error(`Missing extension context: ${key}`);
        if (!isPathValue(value)) throw new Error(`Invalid extension context: ${key}`);
        return encodeURIComponent(value);
    });
    if (!path.startsWith('/') || path.split('/').some((part) => part === '.' || part === '..')) {
        throw new Error('Invalid extension route');
    }
    return { url: `/api/calm/extensions/${encodeURIComponent(id)}/api${path}`, params: context };
}

export class ExtensionService {
    private readonly ax: AxiosInstance;
    private registry?: Promise<RegistryEntry[]>;

    constructor(axiosInstance?: AxiosInstance) {
        // Not apiClient: an extension failure stays in its slot and must not open the global auth or outage page.
        this.ax = axiosInstance ?? axios.create();
    }

    private loadRegistry(): Promise<RegistryEntry[]> {
        this.registry ??= getAuthHeaders()
            .then((headers) => this.ax.get<{ values?: RegistryEntry[] }>('/api/calm/extensions', { headers }))
            .then((res) => (Array.isArray(res.data?.values) ? res.data.values : []))
            .then((values) => values.filter((value) => value?.hubApi === SUPPORTED_HUB_API))
            .catch((error) => {
                this.registry = undefined;
                // The registry is a Hub call, so a 401 means the Hub session ended. An extension call keeps its 401 in its slot.
                if (isSignedOut(error)) authStore.setAuthError(401);
                return Promise.reject(error);
            });
        return this.registry;
    }

    public async fetchExtensions(): Promise<ExtensionSummary[]> {
        return this.loadRegistry().catch((error) => {
            console.error('%s', 'Error fetching extensions:', error);
            return Promise.reject(new ExtensionRegistryError('Error fetching extensions', isSignedOut(error)));
        });
    }

    public async fetchDecoratorViews(): Promise<DecoratorView[]> {
        return this.loadRegistry()
            .then((values) =>
                values.flatMap((extension) =>
                    (extension.contributes?.['decorator-views'] ?? []).map((view) =>
                        typeof extension.id === 'string'
                            ? {
                                  ...view,
                                  source: {
                                      id: extension.id,
                                      name: extension.name || extension.id,
                                      builtIn: isBuiltInExtension(extension.id),
                                  },
                              }
                            : view
                    )
                )
            )
            .catch((error) => {
                const errorMessage = 'Error fetching decorator views:';
                console.error('%s', errorMessage, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    public async call(id: string, route: ExtensionRoute, context: ExtensionContext, signal?: AbortSignal): Promise<unknown> {
        const headers = await getAuthHeaders();
        const request = extensionRequest(id, route, context);
        return this.ax
            .request({
                ...request,
                method: route.method,
                headers,
                signal,
                ...(!['GET', 'DELETE'].includes(route.method) ? { data: context } : {}),
            })
            .then((res) => res.data)
            .catch((error) => {
                console.error('%s', 'Error calling extension:', error);
                return Promise.reject(new Error('Error calling extension'));
            });
    }
}
