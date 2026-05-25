import { afterEach, describe, expect, it, vi } from 'vitest'
import { CdnError, createCdnClient } from './cdn-client'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function stubFetch(impl: (url: string) => Promise<Response>) {
  const spy = vi.fn((input: string | URL) => impl(String(input)))
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('createCdnClient', () => {
  it('fetches and parses JSON, joining base and path', async () => {
    const spy = stubFetch(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }))
    const client = createCdnClient('https://cdn.example.com/data/')
    const result = await client.fetchJson<{ ok: number }>('items.json')
    expect(result).toEqual({ ok: 1 })
    expect(spy).toHaveBeenCalledWith('https://cdn.example.com/data/items.json')
  })

  it('caches repeated requests to the same path', async () => {
    const spy = stubFetch(async () => new Response('{"v":1}', { status: 200 }))
    const client = createCdnClient('https://cdn.example.com')
    await client.fetchJson('a.json')
    await client.fetchJson('a.json')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('throws CdnError on non-OK response', async () => {
    stubFetch(async () => new Response('nope', { status: 404 }))
    const client = createCdnClient('https://cdn.example.com')
    await expect(client.fetchJson('missing.json')).rejects.toBeInstanceOf(CdnError)
    await expect(client.fetchJson('missing.json')).rejects.toThrow(/missing\.json/)
  })

  it('throws CdnError when fetch rejects', async () => {
    stubFetch(async () => {
      throw new Error('network down')
    })
    const client = createCdnClient('https://cdn.example.com')
    await expect(client.fetchJson('x.json')).rejects.toBeInstanceOf(CdnError)
  })
})
