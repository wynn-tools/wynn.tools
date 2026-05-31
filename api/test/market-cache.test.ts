import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCachedPrice, getCachedPrices } from '../src/services/market-cache'
import { resetDb } from './helpers/db'

function fakeClient(payload: unknown) {
  const fetchPrice = vi.fn(async () => payload)
  return { client: { fetchPrice }, fetchPrice }
}

function clientThatThrowsFor(badName: string, payload: unknown = { ok: true }) {
  const fetchPrice = vi.fn(async (name: string) => {
    if (name === badName)
      throw new Error('upstream boom')
    return payload
  })
  return { client: { fetchPrice }, fetchPrice }
}

describe('market cache', () => {
  beforeEach(resetDb)

  it('fetches on miss then serves from cache within TTL', async () => {
    const { client, fetchPrice } = fakeClient({ name: 'Divzer', average_p50_ema_price: 100 })
    const first = await getCachedPrice({ name: 'Divzer' }, client, { ttlMs: 60_000 })
    const second = await getCachedPrice({ name: 'Divzer' }, client, { ttlMs: 60_000 })
    expect(first).toEqual({ name: 'Divzer', average_p50_ema_price: 100 })
    expect(second).toEqual(first)
    expect(fetchPrice).toHaveBeenCalledTimes(1)
  })

  it('refetches when the row is older than the TTL', async () => {
    const { client, fetchPrice } = fakeClient({ name: 'Divzer' })
    await getCachedPrice({ name: 'Divzer' }, client, { ttlMs: 60_000 })
    await getCachedPrice({ name: 'Divzer' }, client, { ttlMs: -1 })
    expect(fetchPrice).toHaveBeenCalledTimes(2)
  })

  it('caches null (no-listings) results', async () => {
    const { client, fetchPrice } = fakeClient(null)
    expect(await getCachedPrice({ name: 'Ghost' }, client, { ttlMs: 60_000 })).toBeNull()
    expect(await getCachedPrice({ name: 'Ghost' }, client, { ttlMs: 60_000 })).toBeNull()
    expect(fetchPrice).toHaveBeenCalledTimes(1)
  })

  it('batch resolves, fetching only misses', async () => {
    const { client, fetchPrice } = fakeClient({ ok: true })
    await getCachedPrice({ name: 'A' }, client, { ttlMs: 60_000 }) // pre-warm A
    const out = await getCachedPrices([{ name: 'A' }, { name: 'B', tier: 6 }], client, { ttlMs: 60_000 })
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ ok: true })
    expect(out[1]).toEqual({ ok: true })
    expect(fetchPrice).toHaveBeenCalledTimes(2) // pre-warm + B only
  })

  it('serves a stale cached value when upstream throws', async () => {
    const good = fakeClient({ name: 'Divzer', v: 1 })
    await getCachedPrice({ name: 'Divzer' }, good.client, { ttlMs: 60_000 }) // warm cache
    const bad = clientThatThrowsFor('Divzer')
    const out = await getCachedPrice({ name: 'Divzer' }, bad.client, { ttlMs: -1 }) // force stale
    expect(out).toEqual({ name: 'Divzer', v: 1 }) // served stale, not an error
    expect(bad.fetchPrice).toHaveBeenCalledTimes(1)
  })

  it('rethrows when upstream throws and nothing is cached', async () => {
    const bad = clientThatThrowsFor('Ghost')
    await expect(getCachedPrice({ name: 'Ghost' }, bad.client, { ttlMs: 60_000 })).rejects.toThrow()
  })

  it('batch maps a failing item to null without failing the whole batch', async () => {
    const bad = clientThatThrowsFor('B', { ok: true })
    const out = await getCachedPrices([{ name: 'A' }, { name: 'B' }], bad.client, { ttlMs: 60_000 })
    expect(out[0]).toEqual({ ok: true })
    expect(out[1]).toBeNull()
  })
})
