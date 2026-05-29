import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { createSession } from '../src/services/sessions'
import { resetDb } from './helpers/db'

const ORACLE_HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

function app() {
  const a = createApp()
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}
async function session() {
  const [u] = await getDb().insert(schema.users).values({ discordId: 'o', username: 'owner' }).returning()
  return { user: u, cookie: `session=${await createSession(u.id)}` }
}

describe('builds routes (no network)', () => {
  beforeEach(resetDb)

  it('returns paginated shape for GET /v1/builds when empty', async () => {
    const res = await app()('/v1/builds')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ data: [], nextCursor: null })
  })

  it('returns paginated shape for GET /v1/builds/mine', async () => {
    const { user, cookie } = await session()
    await getDb().insert(schema.builds).values({
      id: 'mine1',
      userId: user.id,
      name: 'MyBuild',
      buildString: ORACLE_HASH,
      gameVersion: '2.2.0.31',
      visibility: 'private',
    })
    const res = await app()('/v1/builds/mine', { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('nextCursor')
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('MyBuild')
    expect(body.data[0].visibility).toBe('private')
    expect(body.nextCursor).toBeNull()
  })

  it('patches name on PATCH /v1/builds/:id', async () => {
    const { user, cookie } = await session()
    const [b] = await getDb().insert(schema.builds).values({
      id: 'patch1',
      userId: user.id,
      name: 'PatchMe',
      buildString: ORACLE_HASH,
      gameVersion: 'old',
      visibility: 'private',
    }).returning()
    const res = await app()(`/v1/builds/${b.id}`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Updated')
  })

  it('401 on create without auth', async () => {
    const res = await app()('/v1/builds', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x', buildString: ORACLE_HASH }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects an invalid build string with 400 invalid_build', async () => {
    const { cookie } = await session()
    const res = await app()('/v1/builds', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'bad', buildString: 'CU' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('invalid_build')
  })

  it('returns 404 for a private build to an anonymous viewer (no decode)', async () => {
    const { user } = await session()
    const [b] = await getDb().insert(schema.builds).values({
      id: 'priv1',
      userId: user.id,
      name: 'secret',
      buildString: ORACLE_HASH,
      gameVersion: '2.2.0.31',
      visibility: 'private',
    }).returning()
    expect((await app()(`/v1/builds/${b.id}`)).status).toBe(404)
  })

  it('lists a user\'s public builds without decoding', async () => {
    const { user } = await session()
    await getDb().insert(schema.builds).values({
      id: 'pub1',
      userId: user.id,
      name: 'A',
      buildString: ORACLE_HASH,
      gameVersion: '2.2.0.31',
      visibility: 'public',
    })
    const res = await app()(`/v1/users/${user.id}/builds`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('A')
  })
})

describe.skipIf(!process.env.LIVE_CDN)('builds routes (live CDN)', () => {
  beforeEach(resetDb)

  it('creates, reads decoded, and gates private after patch', async () => {
    const { cookie } = await session()
    const create = await app()('/v1/builds', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'My build', buildString: ORACLE_HASH, visibility: 'public' }),
    })
    expect(create.status).toBe(201)
    const { id } = await create.json()

    const read = await app()(`/v1/builds/${id}`)
    expect(read.status).toBe(200)
    const body = await read.json()
    expect(body.name).toBe('My build')
    expect(body.decoded).toBeTruthy()
    expect(body.gameVersion).toMatch(/^\d+\./)

    await app()(`/v1/builds/${id}`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ visibility: 'private' }),
    })
    expect((await app()(`/v1/builds/${id}`)).status).toBe(404)
    expect((await app()(`/v1/builds/${id}`, { headers: { cookie } })).status).toBe(200)
  }, 60_000)
})
