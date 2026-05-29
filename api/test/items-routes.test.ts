import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { createSession } from '../src/services/sessions'
import { resetDb } from './helpers/db'

function app() {
  const a = createApp()
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}
async function session() {
  const [u] = await getDb().insert(schema.users).values({ discordId: 'ci', username: 'crafter' }).returning()
  return `session=${await createSession(u.id)}`
}

describe('items routes', () => {
  beforeEach(resetDb)

  it('creates, reads, gates private, deletes', async () => {
    const cookie = await session()
    const created = await app()('/v1/items', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ring', itemData: { ids: { hp: 100 } }, gameVersion: '2.2.0.31', visibility: 'public' }),
    })
    expect(created.status).toBe(201)
    const { id } = await created.json()

    const read = await app()(`/v1/items/${id}`)
    expect(read.status).toBe(200)
    expect((await read.json()).itemData).toEqual({ ids: { hp: 100 } })

    await app()(`/v1/items/${id}`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ visibility: 'private' }),
    })
    expect((await app()(`/v1/items/${id}`)).status).toBe(404)

    expect((await app()(`/v1/items/${id}`, { method: 'DELETE', headers: { cookie } })).status).toBe(200)
  })

  it('401 on create without auth', async () => {
    const res = await app()('/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x', itemData: {}, gameVersion: '2.2.0.31' }),
    })
    expect(res.status).toBe(401)
  })
})
