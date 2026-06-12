import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '../src/db/client'
import { env } from '../src/env'
import { testApp } from './helpers/app'
import { makeUserWithSession } from './helpers/auth'
import { resetDb } from './helpers/db'
import { insertCreation } from './helpers/stock-fixtures'

describe('pOST /v1/stock/:slug/report', () => {
  beforeEach(resetDb)

  it('records a report', async () => {
    await insertCreation({ slug: 'k' })
    const u = await makeUserWithSession()
    const r = await testApp()('/v1/stock/k/report', {
      method: 'POST',
      body: JSON.stringify({ reason: 'looks like spam' }),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': u.cookie,
        'Origin': env().FRONTEND_URL,
      },
    })
    expect(r.status).toBe(200)
    const rows = await getDb().query.stockReport.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].reason).toBe('looks like spam')
  })

  it('401 unauthenticated', async () => {
    await insertCreation({ slug: 'k' })
    const r = await testApp()('/v1/stock/k/report', {
      method: 'POST',
      body: JSON.stringify({ reason: 'x' }),
      headers: {
        'Content-Type': 'application/json',
        'Origin': env().FRONTEND_URL,
      },
    })
    expect(r.status).toBe(401)
  })
})
