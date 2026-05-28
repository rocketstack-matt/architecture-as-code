import type { AuthHeadersProvider } from '@finos/calm-hub-client'
import type { HubConfigService } from './hub-config-service'

/**
 * Reads the SecretStorage-backed bearer token at request time and turns it
 * into the headers the lifted Hub services expect. Refresh-on-401 and
 * device-code polling are stubs for the next phase.
 */
export class HubAuthService implements AuthHeadersProvider {
    constructor(private config: HubConfigService) {}

    async getAuthHeaders(): Promise<Record<string, string>> {
        const mode = this.config.getAuthMode()
        if (mode === 'none') return {}
        const token = await this.config.readToken()
        if (!token) return {}
        return { Authorization: `Bearer ${token}` }
    }
}
