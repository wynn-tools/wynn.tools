import { Hono } from 'hono'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, schema } from '../src/db/client'
import { onError } from '../src/lib/errors'
import { hasScope, requireAuth } from '../src/middleware/auth'
import { createApiKey } from '../src/services/api-keys'
import { createSession } from '../src/services/sessions'
import { resetDb } from './helpers/db'

function protectedApp() {
  const app = new Hono()
  app.onError(onError)
  app.get('/v1/secret', requireAuth, (c) => {
    const auth = c.get('auth')
    return c.json({ userId: auth.user.id, canWrite: hasScope(auth, 'builds:write') })
  })
  return (path: string, init?: RequestInit) => app.request(`http://test${path}`, init)
}

describe('requireAuth', () => {
  beforeEach(resetDb)

  it('401 without credentials', async () => {
    expect((await protectedApp()('/v1/secret')).status).toBe(401)
  })

  it('accepts a session cookie with full capabilities', async () => {
    const [u] = await getDb().insert(schema.users).values({ discordId: 's', username: 's' }).returning()
    const token = await createSession(u.id)
    const res = await protectedApp()('/v1/secret', { headers: { cookie: `session=${token}` } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ userId: u.id, canWrite: true })
  })

  it('accepts a bearer key scoped to its abilities', async () => {
    const [u] = await getDb().insert(schema.users).values({ discordId: 'b', username: 'b' }).returning()
    const { plaintext } = await createApiKey(u.id, 'ro', ['builds:read'])
    const res = await protectedApp()('/v1/secret', { headers: { authorization: `Bearer ${plaintext}` } })
    expect(await res.json()).toEqual({ userId: u.id, canWrite: false })
  })
})
