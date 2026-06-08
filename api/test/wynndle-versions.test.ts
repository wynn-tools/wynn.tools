import { expect, it, vi } from 'vitest'
import { createVersionsResolver } from '../src/services/wynndle-versions'

it('returns head version and caches within TTL', async () => {
  const data = [
    { gameVersion: '2.1.0', contentHash: 'a' },
    { gameVersion: '2.2.0.31', contentHash: 'b' },
  ]
  const f = vi.fn(async () => new Response(JSON.stringify(data), { status: 200 }))
  let t = 0
  const r = createVersionsResolver({
    cdnBase: 'https://cdn.test/',
    fetch: f as unknown as typeof fetch,
    ttlMs: 60_000,
    now: () => t,
  })
  expect(await r.current()).toBe('2.2.0.31')
  expect(await r.current()).toBe('2.2.0.31')
  expect(f).toHaveBeenCalledTimes(1)
  t = 70_000
  expect(await r.current()).toBe('2.2.0.31')
  expect(f).toHaveBeenCalledTimes(2)
})
