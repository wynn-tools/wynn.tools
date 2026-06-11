import { beforeEach, describe, expect, it } from 'vitest'
import { testApp } from './helpers/app'
import { resetDb } from './helpers/db'

describe('stock smoke', () => {
  beforeEach(resetDb)
  it('gET /v1/stock returns empty list on a fresh DB', async () => {
    const r = await testApp()('/v1/stock')
    expect(r.status).toBe(200)
    const body = await r.json() as { items: unknown[] }
    expect(body.items).toEqual([])
  })
})
