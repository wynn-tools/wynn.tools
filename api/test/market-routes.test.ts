import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app'
import { resetDb } from './helpers/db'

function app() {
  const a = createApp()
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}

function stubUpstream(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify(payload), { status: payload == null ? 404 : 200 }),
  ))
}

describe('market routes', () => {
  beforeEach(async () => {
    await resetDb()
    vi.unstubAllGlobals()
  })

  it('gET /v1/market/price/:name returns the payload', async () => {
    stubUpstream({ name: 'Divzer', average_p50_ema_price: 13650 })
    const res = await app()('/v1/market/price/Divzer')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ name: 'Divzer' })
  })

  it('pOST /v1/market/prices aligns results to request order (null for no-data)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const found = url.includes('/Found/')
      return new Response(found ? JSON.stringify({ name: 'Found' }) : '{}', { status: found ? 200 : 404 })
    }))
    const res = await app()('/v1/market/prices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ name: 'Missing' }, { name: 'Found' }] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(2)
    expect(body.results[0]).toBeNull() // Missing → no data
    expect(body.results[1]).toMatchObject({ name: 'Found' }) // aligned by index
  })

  it('rate-limits a flood of requests from one IP', async () => {
    stubUpstream({ name: 'Divzer' })
    const call = app()
    let last = 200
    for (let i = 0; i < 40; i++) {
      const r = await call('/v1/market/price/Divzer', { headers: { 'x-forwarded-for': '9.9.9.9' } })
      last = r.status
    }
    expect(last).toBe(429)
  })

  it('gET /v1/market/history/:name forwards upstream history', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify([{ name: 'Divzer', timestamp: '2026-03-13T00:00:00Z' }]), { status: 200 })))
    const res = await app()('/v1/market/history/Divzer')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
  })

  it('gET /v1/market/history/:name returns [] on upstream error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    const res = await app()('/v1/market/history/Divzer')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})
