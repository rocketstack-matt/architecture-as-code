import axios, { AxiosInstance } from 'axios';
import { getAuthHeaders } from '../authService.js';
import type { DecoratorView } from '../visualizer/contracts/contracts.js';

interface Extension {
    contributes?: { 'decorator-views'?: DecoratorView[] };
}

export class ExtensionService {
    private readonly ax: AxiosInstance;

    constructor(axiosInstance?: AxiosInstance) {
        // Registry failure must not trigger the shared client's global error page.
        this.ax = axiosInstance ?? axios.create();
    }

    public async fetchDecoratorViews(): Promise<DecoratorView[]> {
        const headers = await getAuthHeaders();
        return this.ax.get<{ values: Extension[] }>('/api/calm/extensions', { headers })
            .then((res) => (Array.isArray(res.data?.values) ? res.data.values : [])
                .flatMap((extension) => extension.contributes?.['decorator-views'] ?? []))
            .catch((error) => {
                const errorMessage = 'Error fetching decorator views:';
                console.error('%s', errorMessage, error);
                return Promise.reject(new Error(errorMessage));
            });
    }
}
