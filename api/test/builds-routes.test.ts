import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { createSession } from '../src/services/sessions'
import { resetDb } from './helpers/db'

const ORACLE_HASH = 'CU0mCX5GOm3P5H05coX-DEdG4kYgBjtUktZ-B0'

function app() {
  const a = createApp()
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}
async function session() {
  const [u] = await getDb().insert(schema.users).values({ id: newResourceId(), discordId: 'o', username: 'owner' }).returning()
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

  it('filters by name with ?q=', async () => {
    const { user } = await session()
    await getDb().insert(schema.builds).values([
      { id: 'b1', userId: user.id, name: 'Warrior DPS', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
      { id: 'b2', userId: user.id, name: 'Mage Tank', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
    ])
    const res = await app()('/v1/builds?q=warrior')
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Warrior DPS')
  })

  it('sorts by name ascending with ?sort=name', async () => {
    const { user } = await session()
    await getDb().insert(schema.builds).values([
      { id: 'c1', userId: user.id, name: 'Zebra', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
      { id: 'c2', userId: user.id, name: 'Apple', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
      { id: 'c3', userId: user.id, name: 'Mango', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
    ])
    const res = await app()('/v1/builds?sort=name')
    const body = await res.json()
    const names = body.data.map((d: { name: string }) => d.name)
    expect(names).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('filters by class with ?class=Warrior', async () => {
    const { user } = await session()
    await getDb().insert(schema.builds).values([
      { id: 'd1', userId: user.id, name: 'W', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public', playerClass: 'Warrior' },
      { id: 'd2', userId: user.id, name: 'A', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public', playerClass: 'Archer' },
    ])
    const res = await app()('/v1/builds?class=Warrior')
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('W')
  })

  it('filters by itemId with ?itemId=42', async () => {
    const { user } = await session()
    await getDb().insert(schema.builds).values([
      { id: 'e1', userId: user.id, name: 'HasIt', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public', itemIds: [42, 99] },
      { id: 'e2', userId: user.id, name: 'NoIt', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public', itemIds: [7, 8] },
    ])
    const res = await app()('/v1/builds?itemId=42')
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('HasIt')
  })

  it('paginates correctly with ?sort=name cursor', async () => {
    const { user } = await session()
    // Insert 3 builds alphabetically out of order; use limit=2 to force pagination
    await getDb().insert(schema.builds).values([
      { id: 'pag1', userId: user.id, name: 'Aardvark', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
      { id: 'pag2', userId: user.id, name: 'Beaver', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
      { id: 'pag3', userId: user.id, name: 'Cougar', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public' },
    ])
    // Page 1
    const res1 = await app()('/v1/builds?sort=name&limit=2')
    const body1 = await res1.json()
    expect(body1.data.map((d: { name: string }) => d.name)).toEqual(['Aardvark', 'Beaver'])
    expect(body1.nextCursor).not.toBeNull()
    // Page 2
    const res2 = await app()(`/v1/builds?sort=name&limit=2&cursor=${body1.nextCursor}`)
    const body2 = await res2.json()
    expect(body2.data.map((d: { name: string }) => d.name)).toEqual(['Cougar'])
    expect(body2.nextCursor).toBeNull()
  })

  it('composes q and class filters', async () => {
    const { user } = await session()
    await getDb().insert(schema.builds).values([
      { id: 'f1', userId: user.id, name: 'Fast Archer', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public', playerClass: 'Archer' },
      { id: 'f2', userId: user.id, name: 'Fast Warrior', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public', playerClass: 'Warrior' },
      { id: 'f3', userId: user.id, name: 'Slow Archer', buildString: ORACLE_HASH, gameVersion: '2.2', visibility: 'public', playerClass: 'Archer' },
    ])
    const res = await app()('/v1/builds?q=fast&class=Archer')
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Fast Archer')
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
