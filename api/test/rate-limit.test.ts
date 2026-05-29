import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { onError } from '../src/lib/errors'
import { rateLimit } from '../src/middleware/rate-limit'

function app(limit: number) {
  const a = new Hono()
  a.onError(onError)
  a.use('*', rateLimit({ limit, windowMs: 60_000 }))
  a.get('/', c => c.json({ ok: true }))
  return (init?: RequestInit) => a.request('http://test/', init)
}

describe('rateLimit', () => {
  it('ignores requests without a bearer key', async () => {
    const call = app(1)
    expect((await call()).status).toBe(200)
    expect((await call()).status).toBe(200)
  })

  it('limits per key', async () => {
    const call = app(2)
    const headers = { authorization: 'Bearer wt_live_keyA' }
    expect((await call({ headers })).status).toBe(200)
    const second = await call({ headers })
    expect(second.headers.get('RateLimit-Remaining')).toBe('0')
    const third = await call({ headers })
    expect(third.status).toBe(429)
    expect((await third.json()).error.code).toBe('rate_limited')
    expect(third.headers.get('Retry-After')).toBeTruthy()
  })
})
