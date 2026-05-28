import * as vscode from 'vscode'

/**
 * Reads the `calm.hub.*` settings and the SecretStorage-backed bearer token.
 * Centralised so the auth service, data source, and tree view all see the
 * same view of the user's configuration.
 */
export class HubConfigService {
    private static readonly TOKEN_KEY = 'calm.hub.token'

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Base URL of the Hub backend. Returns undefined when the user hasn't
     * configured it — consumers treat that as "Hub disabled".
     */
    getBaseUrl(): string | undefined {
        const cfg = vscode.workspace.getConfiguration('calm')
        const url = cfg.get<string>('hub.url', '').trim()
        return url ? url.replace(/\/+$/, '') : undefined
    }

    /** Authentication mode chosen by the user. */
    getAuthMode(): 'none' | 'bearer' | 'device-code' {
        const cfg = vscode.workspace.getConfiguration('calm')
        const mode = cfg.get<string>('hub.auth.mode', 'none')
        if (mode === 'bearer' || mode === 'device-code') return mode
        return 'none'
    }

    /** Namespaces the user wants pinned to the top of the Hub view. */
    getPinnedNamespaces(): string[] {
        const cfg = vscode.workspace.getConfiguration('calm')
        return cfg.get<string[]>('hub.namespaces.pinned', []) ?? []
    }

    /** Reads the stored bearer token (set by the sign-in command). */
    async readToken(): Promise<string | undefined> {
        return this.context.secrets.get(HubConfigService.TOKEN_KEY)
    }

    /** Stores the bearer token in SecretStorage. */
    async writeToken(token: string): Promise<void> {
        await this.context.secrets.store(HubConfigService.TOKEN_KEY, token)
        await this.setSignedInContext(true)
    }

    /** Clears the stored token. */
    async clearToken(): Promise<void> {
        await this.context.secrets.delete(HubConfigService.TOKEN_KEY)
        await this.setSignedInContext(false)
    }

    /**
     * Pushes a context key so `package.json` menus can hide/show the
     * sign-in / sign-out items based on auth state.
     */
    async setSignedInContext(signedIn: boolean): Promise<void> {
        await vscode.commands.executeCommand('setContext', 'calm.hub.signedIn', signedIn)
    }

    /** True when the Hub view should be active — base URL configured. */
    isEnabled(): boolean {
        return !!this.getBaseUrl()
    }
}
