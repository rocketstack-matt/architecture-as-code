import { describe, it, expect, vi } from 'vitest'
import { HubCache } from './hub-cache.js'

describe('HubCache', () => {
    it('returns the loader value on first call and reuses it within the TTL', async () => {
        const loader = vi.fn().mockResolvedValue('value-1')
        const cache = new HubCache(10_000)
        expect(await cache.get('namespaces', loader)).toBe('value-1')
        expect(await cache.get('namespaces', loader)).toBe('value-1')
        expect(loader).toHaveBeenCalledTimes(1)
    })

    it('re-fetches once the TTL has elapsed', async () => {
        vi.useFakeTimers()
        try {
            const loader = vi.fn()
                .mockResolvedValueOnce('first')
                .mockResolvedValueOnce('second')
            const cache = new HubCache(1_000)
            expect(await cache.get('namespaces', loader)).toBe('first')
            vi.advanceTimersByTime(2_000)
            expect(await cache.get('namespaces', loader)).toBe('second')
        } finally {
            vi.useRealTimers()
        }
    })

    it('invalidate() with no prefix clears every entry', async () => {
        const cache = new HubCache(60_000)
        await cache.get('a', async () => 1)
        await cache.get('b', async () => 2)
        expect(cache.size()).toBe(2)
        cache.invalidate()
        expect(cache.size()).toBe(0)
    })

    it('invalidate(prefix) clears only entries with matching prefix', async () => {
        const cache = new HubCache(60_000)
        await cache.get('ns:finos/architectures', async () => 1)
        await cache.get('ns:acme/architectures', async () => 2)
        cache.invalidate('ns:finos')
        expect(cache.size()).toBe(1)
    })
})
