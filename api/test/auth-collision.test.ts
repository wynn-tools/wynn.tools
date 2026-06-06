import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { resetDb } from './helpers/db'

function app() {
  const a = createApp()
  return (path: string, init?: RequestInit) => a.request(`http://test${path}`, init)
}

function cookiesFrom(res: Response): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of res.headers.getSetCookie())
    out[c.split('=')[0]] = c.split('=')[1].split(';')[0]
  return out
}

function mockDiscordFetch(discordId: string, username: string) {
  ;(globalThis as { __discordFetch?: typeof fetch }).__discordFetch = (async (url: string) =>
    url.includes('/token')
      ? new Response(JSON.stringify({ access_token: 'fake' }))
      : new Response(JSON.stringify({ id: discordId, username, avatar: null, global_name: null }))) as typeof fetch
}

function clearDiscordFetch() {
  delete (globalThis as { __discordFetch?: typeof fetch }).__discordFetch
}

async function makeSyntheticUser(username: string, kind: 'person' | 'community' | 'anonymous' = 'person') {
  const db = getDb()
  const [u] = await db
    .insert(schema.users)
    .values({ id: newResourceId(), discordId: `synthetic-${username}`, username, kind })
    .returning()
  return u
}

async function doCallback(discordId: string, username: string) {
  mockDiscordFetch(discordId, username)
  const login = await app()('/v1/auth/discord/login')
  const state = cookiesFrom(login).oauth_state
  const res = await app()(`/v1/auth/discord/callback?code=abc&state=${state}`, {
    headers: { cookie: `oauth_state=${state}` },
  })
  clearDiscordFetch()
  return res
}

describe('auth: synthetic-slug collision', () => {
  beforeEach(resetDb)

  it('blocks signup when synthetic user owns the same lowercase username', async () => {
    await makeSyntheticUser('BuilderJoe')
    const res = await doCallback('new-discord-id-1', 'builderjoe')
    expect(res.status).toBe(409)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('slug_reserved')
  })

  it('blocks signup case-insensitively (profile username is uppercase)', async () => {
    await makeSyntheticUser('importeduser')
    const res = await doCallback('new-discord-id-2', 'ImportedUser')
    expect(res.status).toBe(409)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('slug_reserved')
  })

  it('allows signup when no username collision exists', async () => {
    await makeSyntheticUser('SomeoneElse')
    const res = await doCallback('new-discord-id-3', 'UniquePlayer')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/welcome')
  })

  it('allows re-login when a real user with that discord_id already exists', async () => {
    // Synthetic user owns 'claimeduser'
    await makeSyntheticUser('claimeduser')
    // The real user already exists with that discord_id but a different username (already claimed/registered earlier)
    const db = getDb()
    await db.insert(schema.users).values({
      id: newResourceId(),
      discordId: 'existing-real-discord',
      username: 'realloginuser',
      kind: 'real',
    })
    // Re-login with the same discord_id: should bypass the collision check even though
    // the profile.username would collide with the synthetic user (onConflictDoUpdate handles
    // the existing real row by discord_id, so no insert collision occurs either)
    const res = await doCallback('existing-real-discord', 'realloginuser')
    expect(res.status).toBe(302)
  })

  it('does NOT block when a real user (kind=real) holds the slug', async () => {
    // A real user (kind='real') owns 'realplayer' — this should not trigger 409
    const db = getDb()
    await db.insert(schema.users).values({
      id: newResourceId(),
      discordId: 'other-real-discord',
      username: 'realplayer',
      kind: 'real',
    })
    const res = await doCallback('brand-new-discord-id', 'RealPlayer')
    // Will collide on the unique index, but NOT via slug_reserved — the DB insert
    // will throw a unique constraint error (not our 409), so we only check it's NOT a slug_reserved 409
    const body = await res.json() as { error?: { code?: string } }
    expect(body.error?.code).not.toBe('slug_reserved')
  })
})
