import axios, { AxiosInstance } from 'axios';
import { InterfaceDetail, AuthHeadersProvider } from '../types.js';

const NO_AUTH: AuthHeadersProvider = { getAuthHeaders: async () => ({}) };

export class InterfaceService {
    private readonly ax: AxiosInstance;
    private readonly authProvider: AuthHeadersProvider;

    constructor(axiosInstance?: AxiosInstance, authProvider?: AuthHeadersProvider) {
        this.ax = axiosInstance ?? axios.create();
        this.authProvider = authProvider ?? NO_AUTH;
    }

    public async fetchInterfacesForNamespace(namespace: string): Promise<InterfaceDetail[]> {
        const headers = await this.authProvider.getAuthHeaders();
        return this.ax
            .get(`/calm/namespaces/${encodeURIComponent(namespace)}/interfaces`, { headers })
            .then((res) => {
                return Array.isArray(res.data?.values) ? res.data.values : [];
            })
            .catch((error) => {
                const errorMessage = `Error fetching interfaces for namespace ${namespace}:`;
                console.error('%s', errorMessage, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    public async fetchInterfaceVersions(namespace: string, interfaceId: number): Promise<string[]> {
        const headers = await this.authProvider.getAuthHeaders();
        return this.ax
            .get(`/calm/namespaces/${encodeURIComponent(namespace)}/interfaces/${interfaceId}/versions`, { headers })
            .then((res) => {
                return Array.isArray(res.data?.values) ? res.data.values : [];
            })
            .catch((error) => {
                const errorMessage = `Error fetching versions for interface ${interfaceId}:`;
                console.error('%s', errorMessage, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    public async fetchInterfaceForVersion(namespace: string, interfaceId: number, version: string): Promise<unknown> {
        const headers = await this.authProvider.getAuthHeaders();
        return this.ax
            .get(`/calm/namespaces/${encodeURIComponent(namespace)}/interfaces/${interfaceId}/versions/${encodeURIComponent(version)}`, { headers })
            .then((res) => res.data)
            .catch((error) => {
                const errorMessage = `Error fetching interface ${interfaceId} version ${version}:`;
                console.error('%s', errorMessage, error);
                return Promise.reject(new Error(errorMessage));
            });
    }
}
