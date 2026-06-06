import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { resetDb } from './helpers/db'

function app() {
  const a = createApp()
  return (p: string, init?: RequestInit) => a.request(`http://test${p}`, init)
}

describe('profile routes', () => {
  beforeEach(resetDb)

  it('resolves user by case-insensitive username slug', async () => {
    await getDb().insert(schema.users).values({
      id: newResourceId(),
      discordId: 'disc1',
      username: 'YY7erig',
    })
    const res = await app()('/v1/users/yy7erig')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.username).toBe('YY7erig')
    expect(body.canonicalSlug).toBe('YY7erig')
    expect(body.resolvedVia).toBe('username')
  })

  it('falls back to id lookup when username does not match', async () => {
    const id = newResourceId()
    await getDb().insert(schema.users).values({
      id,
      discordId: 'disc2',
      username: 'SomeOtherUser',
    })
    const res = await app()(`/v1/users/${id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(id)
    expect(body.resolvedVia).toBe('id')
  })

  it('returns 404 for unknown slug', async () => {
    const res = await app()('/v1/users/nope-no-such')
    expect(res.status).toBe(404)
  })

  it('includes kind and profileUrl in response', async () => {
    await getDb().insert(schema.users).values({
      id: newResourceId(),
      discordId: 'disc3',
      username: 'testuser',
      kind: 'bot',
      profileUrl: 'https://example.com/testuser',
    })
    const res = await app()('/v1/users/testuser')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe('bot')
    expect(body.profileUrl).toBe('https://example.com/testuser')
  })

  it('returns { private: true } for private profile', async () => {
    await getDb().insert(schema.users).values({
      id: newResourceId(),
      discordId: 'disc4',
      username: 'secretuser',
      profileVisibility: 'private',
    })
    const res = await app()('/v1/users/secretuser')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ private: true })
  })
})
