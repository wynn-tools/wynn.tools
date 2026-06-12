import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { env } from '../src/env'
import { testApp } from './helpers/app'
import { makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'

describe('rate limit', () => {
  beforeEach(resetDb)
  afterAll(resetDb)

  it('caps creations at 3/day', async () => {
    const u = await makeUserWithSession()
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': u.cookie,
      'Origin': env().FRONTEND_URL,
    }
    for (let i = 0; i < 3; i++) {
      const r = await testApp()('/v1/stock', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: `c${i}`, kind: 'infobox', category: 'qol' }),
      })
      expect(r.status).toBe(200)
    }
    const r = await testApp()('/v1/stock', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'overflow', kind: 'infobox', category: 'qol' }),
    })
    expect(r.status).toBe(429)
  })
})
