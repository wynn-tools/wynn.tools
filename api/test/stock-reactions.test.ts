import { beforeEach, describe, expect, it } from 'vitest'
import { env } from '../src/env'
import { testApp } from './helpers/app'
import { makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'
import { insertCreation } from './helpers/stock-fixtures'

function origin() {
  return { Origin: env().FRONTEND_URL }
}

describe('reactions', () => {
  beforeEach(resetDb)

  it('toggles a reaction on and off', async () => {
    await insertCreation({ slug: 'k' })
    const u = await makeUserWithSession()

    const on = await testApp()('/v1/stock/k/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'fire' }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    expect(on.status).toBe(200)
    const counts = await on.json() as { fire: number }
    expect(counts.fire).toBe(1)

    const off = await testApp()('/v1/stock/k/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'fire' }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    expect(off.status).toBe(200)
    const counts2 = await off.json() as { fire: number }
    expect(counts2.fire).toBe(0)
  })

  it('401 when unauthenticated', async () => {
    await insertCreation({ slug: 'k' })
    const r = await testApp()('/v1/stock/k/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'fire' }),
      headers: { 'Content-Type': 'application/json', ...origin() },
    })
    expect(r.status).toBe(401)
  })

  it('400 on unknown emoji', async () => {
    await insertCreation({ slug: 'k' })
    const u = await makeUserWithSession()
    const r = await testApp()('/v1/stock/k/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: 'nope' }),
      headers: { 'Content-Type': 'application/json', 'Cookie': u.cookie, ...origin() },
    })
    expect(r.status).toBe(400)
  })
})
