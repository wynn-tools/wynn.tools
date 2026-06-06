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

async function makeUser(username: string) {
  const [u] = await getDb().insert(schema.users).values({
    id: newResourceId(),
    discordId: `d-${username}`,
    username,
    displayName: username,
  }).returning()
  return u
}

async function makeOwnerWithBuild(visibility: 'public' | 'unlisted' | 'private' = 'public') {
  const u = await makeUser('owner')
  const cookie = `session=${await createSession(u.id)}`
  const [b] = await getDb().insert(schema.builds).values({
    id: newResourceId(),
    userId: u.id,
    name: 'B',
    buildString: ORACLE_HASH,
    gameVersion: '2.2',
    visibility,
  }).returning()
  return { owner: u, cookie, build: b }
}

describe('credits routes', () => {
  beforeEach(resetDb)

  it('pUT replaces ordered credits and returns user fields', async () => {
    const { cookie, build } = await makeOwnerWithBuild()
    const a = await makeUser('alice')
    const b = await makeUser('bob')
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ credits: [{ userId: a.id }, { userId: b.id }] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credits).toHaveLength(2)
    expect(body.credits[0]).toMatchObject({ id: a.id, username: 'alice' })
    expect(body.credits[1]).toMatchObject({ id: b.id, username: 'bob' })
  })

  it('pUT replaces existing credits with a new list', async () => {
    const { cookie, build } = await makeOwnerWithBuild()
    const a = await makeUser('alice')
    const b = await makeUser('bob')
    await getDb().insert(schema.buildCredits).values([
      { buildId: build.id, userId: a.id, position: 0 },
      { buildId: build.id, userId: b.id, position: 1 },
    ])
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ credits: [{ userId: b.id }] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credits).toHaveLength(1)
    expect(body.credits[0].id).toBe(b.id)
  })

  it('pUT rejects over 10', async () => {
    const { cookie, build } = await makeOwnerWithBuild()
    const credits = Array.from({ length: 11 }, (_, i) => ({ userId: `u${i}` }))
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ credits }),
    })
    expect(res.status).toBe(400)
  })

  it('pUT rejects owner in credits', async () => {
    const { cookie, build, owner } = await makeOwnerWithBuild()
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ credits: [{ userId: owner.id }] }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('owner_not_creditable')
  })

  it('pUT rejects unknown user', async () => {
    const { cookie, build } = await makeOwnerWithBuild()
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ credits: [{ userId: 'nope' }] }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('unknown_user')
  })

  it('pUT dedupes repeated userIds preserving order', async () => {
    const { cookie, build } = await makeOwnerWithBuild()
    const a = await makeUser('alice')
    const b = await makeUser('bob')
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ credits: [{ userId: a.id }, { userId: a.id }, { userId: b.id }] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credits.map((x: { id: string }) => x.id)).toEqual([a.id, b.id])
  })

  it('pUT requires auth', async () => {
    const { build } = await makeOwnerWithBuild()
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credits: [] }),
    })
    expect(res.status).toBe(401)
  })

  it('pUT 404 for non-owner', async () => {
    const { build } = await makeOwnerWithBuild()
    const other = await makeUser('other')
    const otherCookie = `session=${await createSession(other.id)}`
    const res = await app()(`/v1/builds/${build.id}/credits`, {
      method: 'PUT',
      headers: { 'cookie': otherCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ credits: [] }),
    })
    expect(res.status).toBe(404)
  })

  it('dELETE me removes the caller from credits', async () => {
    const { build } = await makeOwnerWithBuild()
    const a = await makeUser('alice')
    const aCookie = `session=${await createSession(a.id)}`
    await getDb().insert(schema.buildCredits).values({ buildId: build.id, userId: a.id, position: 0 })
    const res = await app()(`/v1/builds/${build.id}/credits/me`, {
      method: 'DELETE',
      headers: { cookie: aCookie },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    const rows = await getDb().query.buildCredits.findMany({
      where: (bc, { eq }) => eq(bc.buildId, build.id),
    })
    expect(rows).toHaveLength(0)
  })

  it('dELETE me 404 when caller not credited', async () => {
    const { build } = await makeOwnerWithBuild()
    const a = await makeUser('alice')
    const aCookie = `session=${await createSession(a.id)}`
    const res = await app()(`/v1/builds/${build.id}/credits/me`, {
      method: 'DELETE',
      headers: { cookie: aCookie },
    })
    expect(res.status).toBe(404)
  })

  it('dELETE me requires auth', async () => {
    const { build } = await makeOwnerWithBuild()
    const res = await app()(`/v1/builds/${build.id}/credits/me`, { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('dELETE me 404 for private build to non-owner non-credit', async () => {
    const { build } = await makeOwnerWithBuild('private')
    const a = await makeUser('alice')
    const aCookie = `session=${await createSession(a.id)}`
    const res = await app()(`/v1/builds/${build.id}/credits/me`, {
      method: 'DELETE',
      headers: { cookie: aCookie },
    })
    expect(res.status).toBe(404)
  })
})
