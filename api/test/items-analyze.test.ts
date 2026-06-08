import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'

describe('post /v1/items/analyze', () => {
  it('rejects empty body with 400', async () => {
    const app = createApp()
    const res = await app.request('/v1/items/analyze', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.error?.code).toBe('validation_error')
  })

  it('rejects missing encoded with 400', async () => {
    const app = createApp()
    const res = await app.request('/v1/items/analyze', {
      method: 'POST',
      body: JSON.stringify({ itemName: 'Test Item' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
  })

  it('rejects missing itemName with 400', async () => {
    const app = createApp()
    const res = await app.request('/v1/items/analyze', {
      method: 'POST',
      body: JSON.stringify({ encoded: 'PUA' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
  })

  it('accepts valid payload and returns weights response', async () => {
    const app = createApp()
    const res = await app.request('/v1/items/analyze', {
      method: 'POST',
      body: JSON.stringify({ encoded: 'VALID_ENCODED_STRING', itemName: 'Test Item' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body).toHaveProperty('nori')
    expect(body).toHaveProperty('wynnpool')
    expect(body).toHaveProperty('fetchedAt')
  })
})
