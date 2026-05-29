import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { createSession } from '../src/services/sessions'
import { resetDb } from './helpers/db'

async function sessionFor() {
  const [u] = await getDb().insert(schema.users).values({ id: newResourceId(), discordId: 'm', username: 'm' }).returning()
  return { user: u, cookie: `session=${await createSession(u.id)}` }
}

function app() {
  const a = createApp()
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}

describe('key routes', () => {
  beforeEach(resetDb)

  it('requires a session', async () => {
    expect((await app()('/v1/me/keys')).status).toBe(401)
  })

  it('creates, lists, and revokes', async () => {
    const { cookie } = await sessionFor()
    const created = await app()('/v1/me/keys', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'bot', scopes: ['builds:read'] }),
    })
    expect(created.status).toBe(201)
    const body = await created.json()
    expect(body.plaintext.startsWith('wt_live_')).toBe(true)

    const list = await (await app()('/v1/me/keys', { headers: { cookie } })).json()
    expect(list).toHaveLength(1)
    expect(list[0].plaintext).toBeUndefined()

    const del = await app()(`/v1/me/keys/${body.id}`, { method: 'DELETE', headers: { cookie } })
    expect(del.status).toBe(200)
    const after = await (await app()('/v1/me/keys', { headers: { cookie } })).json()
    expect(after).toHaveLength(0)
  })

  it('rejects invalid scopes', async () => {
    const { cookie } = await sessionFor()
    const res = await app()('/v1/me/keys', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'x', scopes: ['bogus'] }),
    })
    expect(res.status).toBe(400)
  })
})
