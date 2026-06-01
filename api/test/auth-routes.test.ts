import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb, schema } from '../src/db/client'
import { newResourceId } from '../src/lib/ids'
import { createSession } from '../src/services/sessions'
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

async function makeUser(discordId = '99', status: 'unset' | 'joined' | 'declined' = 'unset') {
  const db = getDb()
  const [u] = await db
    .insert(schema.users)
    .values({ id: newResourceId(), discordId, username: 'tester', discordJoinStatus: status })
    .returning()
  const token = await createSession(u.id)
  return { user: u, sessionCookie: `session=${token}` }
}

describe('auth routes', () => {
  beforeEach(resetDb)

  it('login sets state cookie and redirects to discord', async () => {
    const res = await app()('/v1/auth/discord/login')
    expect(res.status).toBe(302)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.hostname).toBe('discord.com')
    const cookies = cookiesFrom(res)
    expect(loc.searchParams.get('state')).toBe(cookies.oauth_state)
  })

  it('fresh user callback redirects to /welcome (first-login interstitial)', async () => {
    ;(globalThis as { __discordFetch?: typeof fetch }).__discordFetch = (async (url: string) =>
      url.includes('/token')
        ? new Response(JSON.stringify({ access_token: 'tok' }))
        : new Response(JSON.stringify({ id: '99', username: 'trinity', avatar: null }))) as typeof fetch

    const login = await app()('/v1/auth/discord/login')
    const state = cookiesFrom(login).oauth_state
    const res = await app()(`/v1/auth/discord/callback?code=abc&state=${state}`, {
      headers: { cookie: `oauth_state=${state}` },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://wynn.tools/welcome?return_to=%2F')
    expect(cookiesFrom(res).session).toBeTruthy()

    const db = getDb()
    const u = await db.query.users.findFirst({ where: (x, { eq }) => eq(x.discordId, '99') })
    expect(u?.username).toBe('trinity')
    delete (globalThis as { __discordFetch?: typeof fetch }).__discordFetch
  })

  it('rejects state mismatch', async () => {
    const res = await app()('/v1/auth/discord/callback?code=abc&state=evil', {
      headers: { cookie: 'oauth_state=real' },
    })
    expect(res.status).toBe(400)
    expect((await res.json() as { error: { code: string } }).error.code).toBe('invalid_state')
  })

  it('me returns 401 without a session', async () => {
    const res = await app()('/v1/me')
    expect(res.status).toBe(401)
  })

  it('fresh user callback with return_to=/builder/abc redirects to /welcome with that return_to', async () => {
    ;(globalThis as { __discordFetch?: typeof fetch }).__discordFetch = (async (url: string) =>
      url.includes('/token')
        ? new Response(JSON.stringify({ access_token: 'tok' }))
        : new Response(JSON.stringify({ id: '42', username: 'morph', avatar: null }))) as typeof fetch

    const login = await app()('/v1/auth/discord/login?return_to=/builder/abc')
    const loginCookies = cookiesFrom(login)
    const state = loginCookies.oauth_state
    const returnTo = loginCookies.oauth_return_to

    const res = await app()(`/v1/auth/discord/callback?code=xyz&state=${state}`, {
      headers: { cookie: `oauth_state=${state}; oauth_return_to=${returnTo}` },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://wynn.tools/welcome?return_to=%2Fbuilder%2Fabc')
    delete (globalThis as { __discordFetch?: typeof fetch }).__discordFetch
  })
})

describe('discord join flow', () => {
  beforeEach(resetDb)

  it('/auth/discord/join without session redirects to login with intent', async () => {
    const res = await app()('/v1/auth/discord/join')
    expect(res.status).toBe(302)
    const loc = res.headers.get('location')!
    expect(loc).toContain('/v1/auth/discord/login')
    expect(loc).toContain('intent%3Djoin')
  })

  it('/auth/discord/join with session sets join intent and redirects to discord with guilds.join', async () => {
    const { sessionCookie } = await makeUser()
    const res = await app()('/v1/auth/discord/join', {
      headers: { cookie: sessionCookie },
    })
    expect(res.status).toBe(302)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.hostname).toBe('discord.com')
    expect(loc.searchParams.get('scope')).toBe('identify guilds.join')
    const cookies = cookiesFrom(res)
    expect(cookies.oauth_join_intent).toBe('1')
    expect(cookies.oauth_state).toBeTruthy()
  })

  it('callback with join intent calls addGuildMember and flips status to joined', async () => {
    const { user, sessionCookie } = await makeUser('555')
    let putCalled = false
    ;(globalThis as { __discordFetch?: typeof fetch }).__discordFetch = (async (url: string, init?: RequestInit) => {
      if (url.includes('/token'))
        return new Response(JSON.stringify({ access_token: 'utok' }))
      if (url.includes('/users/@me'))
        return new Response(JSON.stringify({ id: '555', username: 'tester', avatar: null }))
      if (url.includes('/guilds/') && init?.method === 'PUT') {
        putCalled = true
        return new Response(null, { status: 201 })
      }
      return new Response('unexpected', { status: 500 })
    }) as typeof fetch

    const init = await app()('/v1/auth/discord/join', { headers: { cookie: sessionCookie } })
    const initCookies = cookiesFrom(init)
    const state = initCookies.oauth_state
    const res = await app()(`/v1/auth/discord/callback?code=abc&state=${state}`, {
      headers: { cookie: `oauth_state=${state}; oauth_join_intent=1; ${sessionCookie}` },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://wynn.tools/')
    expect(putCalled).toBe(true)
    const db = getDb()
    const updated = await db.query.users.findFirst({ where: (x, { eq }) => eq(x.id, user.id) })
    expect(updated?.discordJoinStatus).toBe('joined')
    expect(updated?.discordJoinedAt).toBeInstanceOf(Date)
    delete (globalThis as { __discordFetch?: typeof fetch }).__discordFetch
  })

  it('callback with join intent and addGuildMember failure redirects with discord_join=error', async () => {
    const { sessionCookie } = await makeUser('556')
    ;(globalThis as { __discordFetch?: typeof fetch }).__discordFetch = (async (url: string, init?: RequestInit) => {
      if (url.includes('/token'))
        return new Response(JSON.stringify({ access_token: 'utok' }))
      if (url.includes('/users/@me'))
        return new Response(JSON.stringify({ id: '556', username: 't', avatar: null }))
      if (init?.method === 'PUT')
        return new Response(null, { status: 429 })
      return new Response('unexpected', { status: 500 })
    }) as typeof fetch
    const init = await app()('/v1/auth/discord/join?return_to=/builder', { headers: { cookie: sessionCookie } })
    const state = cookiesFrom(init).oauth_state
    const returnTo = cookiesFrom(init).oauth_return_to
    const res = await app()(`/v1/auth/discord/callback?code=abc&state=${state}`, {
      headers: { cookie: `oauth_state=${state}; oauth_return_to=${returnTo}; oauth_join_intent=1; ${sessionCookie}` },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://wynn.tools/builder?discord_join=error')
    delete (globalThis as { __discordFetch?: typeof fetch }).__discordFetch
  })

  it('callback without intent for declined user goes straight to return_to', async () => {
    await makeUser('decl-1', 'declined')
    ;(globalThis as { __discordFetch?: typeof fetch }).__discordFetch = (async (url: string) =>
      url.includes('/token')
        ? new Response(JSON.stringify({ access_token: 'tok' }))
        : new Response(JSON.stringify({ id: 'decl-1', username: 'd', avatar: null }))) as typeof fetch
    const login = await app()('/v1/auth/discord/login?return_to=/builder')
    const state = cookiesFrom(login).oauth_state
    const returnTo = cookiesFrom(login).oauth_return_to
    const res = await app()(`/v1/auth/discord/callback?code=xyz&state=${state}`, {
      headers: { cookie: `oauth_state=${state}; oauth_return_to=${returnTo}` },
    })
    expect(res.headers.get('location')).toBe('https://wynn.tools/builder')
    delete (globalThis as { __discordFetch?: typeof fetch }).__discordFetch
  })
})
