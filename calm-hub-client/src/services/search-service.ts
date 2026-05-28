import axios, { AxiosInstance } from 'axios';
import { GroupedSearchResults, AuthHeadersProvider } from '../types.js';

const NO_AUTH: AuthHeadersProvider = { getAuthHeaders: async () => ({}) };

export class SearchService {
    private readonly ax: AxiosInstance;
    private readonly authProvider: AuthHeadersProvider;

    constructor(axiosInstance?: AxiosInstance, authProvider?: AuthHeadersProvider) {
        this.ax = axiosInstance ?? axios.create();
        this.authProvider = authProvider ?? NO_AUTH;
    }

    public async search(query: string): Promise<GroupedSearchResults> {
        const headers = await this.authProvider.getAuthHeaders();
        return this.ax
            .get(`/calm/search?q=${encodeURIComponent(query)}`, { headers })
            .then((res) => res.data)
            .catch((error) => {
                const errorMessage = 'Error performing search:';
                console.error(errorMessage, error);
                return Promise.reject(new Error(errorMessage));
            });
    }
}
