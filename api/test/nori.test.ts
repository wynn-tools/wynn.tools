import { describe, expect, it, vi } from 'vitest'
import { createNoriClient } from '../src/services/nori'

describe('nori client', () => {
  it('normalizes Result.scales into WeightProfile[]', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      Result: {
        Warp: { reflection: 68 },
        scales: {
          'Combat Experience': { combatExperience: 0.7, loot: 0.3 },
        },
      },
    }), { status: 200 }))
    const c = createNoriClient({ baseUrl: 'https://nori.fish' }, fakeFetch as unknown as typeof fetch)
    const profiles = await c.fetchWeights('FAKE_ENCODED')
    expect(profiles).toEqual([
      { name: 'Combat Experience', scales: { combatExperience: 0.7, loot: 0.3 } },
    ])
  })

  it('posts to /api/item/analysis with encoded_item body', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ Result: {} }), { status: 200 }))
    const c = createNoriClient({ baseUrl: 'https://nori.fish/' }, fakeFetch as unknown as typeof fetch)
    await c.fetchWeights('PUA_STRING')
    expect(fakeFetch).toHaveBeenCalledOnce()
    const [url, init] = fakeFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://nori.fish/api/item/analysis')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ encoded_item: 'PUA_STRING' })
  })

  it('returns [] on 404', async () => {
    const fakeFetch = vi.fn(async () => new Response('', { status: 404 }))
    const c = createNoriClient({ baseUrl: 'https://nori.fish' }, fakeFetch as unknown as typeof fetch)
    expect(await c.fetchWeights('X')).toEqual([])
  })

  it('throws on 5xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('', { status: 500 }))
    const c = createNoriClient({ baseUrl: 'https://nori.fish' }, fakeFetch as unknown as typeof fetch)
    await expect(c.fetchWeights('X')).rejects.toThrow()
  })

  it('returns [] when body is missing Result', async () => {
    const fakeFetch = vi.fn(async () => new Response('{}', { status: 200 }))
    const c = createNoriClient({ baseUrl: 'https://nori.fish' }, fakeFetch as unknown as typeof fetch)
    expect(await c.fetchWeights('X')).toEqual([])
  })

  it('skips non-numeric scale entries defensively', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      Result: { scales: { A: { x: 1, y: 'bad', z: 2 } } },
    }), { status: 200 }))
    const c = createNoriClient({ baseUrl: 'https://nori.fish' }, fakeFetch as unknown as typeof fetch)
    expect(await c.fetchWeights('X')).toEqual([{ name: 'A', scales: { x: 1, z: 2 } }])
  })
})
