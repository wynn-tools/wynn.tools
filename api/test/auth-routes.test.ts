import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { getDb } from '../src/db/client'
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

  it('callback upserts user, sets session cookie, redirects to frontend', async () => {
    ;(globalThis as any).__discordFetch = async (url: string) =>
      url.includes('/token')
        ? new Response(JSON.stringify({ access_token: 'tok' }))
        : new Response(JSON.stringify({ id: '99', username: 'trinity', avatar: null }))

    const login = await app()('/v1/auth/discord/login')
    const state = cookiesFrom(login).oauth_state
    const res = await app()(`/v1/auth/discord/callback?code=abc&state=${state}`, {
      headers: { cookie: `oauth_state=${state}` },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://wynn.tools')
    expect(cookiesFrom(res).session).toBeTruthy()

    const db = getDb()
    const u = await db.query.users.findFirst({ where: (x, { eq }) => eq(x.discordId, '99') })
    expect(u?.username).toBe('trinity')
    delete (globalThis as any).__discordFetch
  })

  it('rejects state mismatch', async () => {
    const res = await app()('/v1/auth/discord/callback?code=abc&state=evil', {
      headers: { cookie: 'oauth_state=real' },
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('invalid_state')
  })

  it('me returns 401 without a session', async () => {
    const res = await app()('/v1/me')
    expect(res.status).toBe(401)
  })
})
