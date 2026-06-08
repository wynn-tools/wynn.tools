import { describe, expect, it, vi } from 'vitest'
import { createWynnpoolClient } from '../src/services/wynnpool'

describe('wynnpool client', () => {
  it('normalizes weight array into WeightProfile[]', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify([
      {
        item_name: 'Warp',
        weight_name: 'Riftwalker',
        identifications: { healthRegenRaw: 0.35, healthRegen: 0.05, walkSpeed: 0.15 },
      },
      {
        item_name: 'Warp',
        weight_name: 'Lightbender',
        identifications: { manaRegen: 0.3, walkSpeed: 0.24 },
      },
    ]), { status: 200 }))
    const c = createWynnpoolClient({ baseUrl: 'https://api.wynnpool.com' }, fakeFetch as unknown as typeof fetch)
    const profiles = await c.fetchWeights('Warp')
    expect(profiles).toEqual([
      { name: 'Riftwalker', scales: { healthRegenRaw: 0.35, healthRegen: 0.05, walkSpeed: 0.15 } },
      { name: 'Lightbender', scales: { manaRegen: 0.3, walkSpeed: 0.24 } },
    ])
  })

  it('hits /item/:name/weight with encoded name', async () => {
    const fakeFetch = vi.fn(async () => new Response('[]', { status: 200 }))
    const c = createWynnpoolClient({ baseUrl: 'https://api.wynnpool.com/' }, fakeFetch as unknown as typeof fetch)
    await c.fetchWeights('Two Words')
    const [url] = fakeFetch.mock.calls[0] as [string]
    expect(url).toBe('https://api.wynnpool.com/item/Two%20Words/weight')
  })

  it('returns [] on 404', async () => {
    const fakeFetch = vi.fn(async () => new Response('[]', { status: 404 }))
    const c = createWynnpoolClient({ baseUrl: 'https://api.wynnpool.com' }, fakeFetch as unknown as typeof fetch)
    expect(await c.fetchWeights('X')).toEqual([])
  })

  it('throws on 5xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('', { status: 500 }))
    const c = createWynnpoolClient({ baseUrl: 'https://api.wynnpool.com' }, fakeFetch as unknown as typeof fetch)
    await expect(c.fetchWeights('X')).rejects.toThrow()
  })

  it('returns [] when body is not an array', async () => {
    const fakeFetch = vi.fn(async () => new Response('{}', { status: 200 }))
    const c = createWynnpoolClient({ baseUrl: 'https://api.wynnpool.com' }, fakeFetch as unknown as typeof fetch)
    expect(await c.fetchWeights('X')).toEqual([])
  })

  it('skips entries without a weight_name', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify([
      { identifications: { a: 1 } },
      { weight_name: 'Ok', identifications: { a: 1, b: 'bad' } },
    ]), { status: 200 }))
    const c = createWynnpoolClient({ baseUrl: 'https://api.wynnpool.com' }, fakeFetch as unknown as typeof fetch)
    expect(await c.fetchWeights('X')).toEqual([{ name: 'Ok', scales: { a: 1 } }])
  })
})
