import { describe, expect, it, vi } from 'vitest'
import { createWynnventoryClient } from '../src/services/wynnventory'

function clientWith(fetchImpl: typeof fetch) {
  return createWynnventoryClient({ apiKey: 'test-key', baseUrl: 'https://wynnventory.com' }, fetchImpl)
}

describe('wynnventory client', () => {
  it('calls /price with key header and encoded name', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ name: 'Divzer', average_p50_ema_price: 13650 }), { status: 200 }),
    ) as unknown as typeof fetch
    const c = clientWith(fetchImpl)
    const out = await c.fetchPrice('Slay the Spire')

    expect(out).toEqual({ name: 'Divzer', average_p50_ema_price: 13650 })
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://wynnventory.com/api/trademarket/item/Slay%20the%20Spire/price')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Api-Key test-key' })
  })

  it('appends tier and shiny query params', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    const c = clientWith(fetchImpl)
    await c.fetchPrice('Thunder Powder', { tier: 6, shiny: true })

    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://wynnventory.com/api/trademarket/item/Thunder%20Powder/price?tier=6&shiny=true')
  })

  it('returns null on 404 (no data for item)', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 404 })) as unknown as typeof fetch
    const c = clientWith(fetchImpl)
    expect(await c.fetchPrice('Nonexistent')).toBeNull()
  })

  it('rejects on 500 (upstream outage)', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    const c = clientWith(fetchImpl)
    await expect(c.fetchPrice('X')).rejects.toThrow()
  })
})
