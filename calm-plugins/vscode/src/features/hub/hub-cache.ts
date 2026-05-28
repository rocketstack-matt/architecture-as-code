/**
 * In-memory TTL cache keyed by string for the Hub view's lazy fetches.
 * Refresh resets the entire cache.
 */
interface Entry<T> {
    value: T
    expiresAt: number
}

export class HubCache {
    private entries = new Map<string, Entry<unknown>>()

    constructor(private ttlMs = 60_000) {}

    async get<T>(key: string, loader: () => Promise<T>): Promise<T> {
        const now = Date.now()
        const existing = this.entries.get(key) as Entry<T> | undefined
        if (existing && existing.expiresAt > now) {
            return existing.value
        }
        const value = await loader()
        this.entries.set(key, { value, expiresAt: now + this.ttlMs })
        return value
    }

    invalidate(prefix?: string): void {
        if (!prefix) {
            this.entries.clear()
            return
        }
        for (const key of [...this.entries.keys()]) {
            if (key.startsWith(prefix)) this.entries.delete(key)
        }
    }

    size(): number {
        return this.entries.size
    }
}
