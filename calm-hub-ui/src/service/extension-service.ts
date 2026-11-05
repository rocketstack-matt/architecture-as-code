import { AxiosInstance } from 'axios';
import { getAuthHeaders } from '../authService.js';
import { ExtensionContext, ExtensionRoute, ExtensionSummary } from '../model/extensions.js';
import { apiClient } from './utils/api-client.js';

export function extensionRequest(id: string, route: ExtensionRoute, context: ExtensionContext) {
    const values: Record<string, string | undefined> = { ...context };
    const path = route.path.replace(/\{([^}]+)\}/g, (_, key: string) => {
        const value = values[key];
        if (!value) throw new Error(`Missing extension context: ${key}`);
        return encodeURIComponent(value);
    });
    if (!path.startsWith('/') || path.split('/').some((part) => part === '.' || part === '..')) {
        throw new Error('Invalid extension route');
    }
    return { url: `/api/calm/extensions/${encodeURIComponent(id)}/api${path}`, params: context };
}

export class ExtensionService {
    private readonly ax: AxiosInstance;

    constructor(axiosInstance?: AxiosInstance) {
        this.ax = axiosInstance ?? apiClient;
    }

    public async fetchExtensions(): Promise<ExtensionSummary[]> {
        const headers = await getAuthHeaders();
        return this.ax
            .get('/api/calm/extensions', { headers })
            .then((res) => (Array.isArray(res.data?.values) ? res.data.values : []))
            .catch((error) => {
                console.error('%s', 'Error fetching extensions:', error);
                return Promise.reject(new Error('Error fetching extensions'));
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
