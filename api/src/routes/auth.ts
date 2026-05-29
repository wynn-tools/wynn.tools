import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { getDb, schema } from '../db/client'
import { env } from '../env'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { buildAuthorizeUrl, exchangeCode, fetchProfile } from '../services/discord'
import { createSession, deleteSession, getSessionUser } from '../services/sessions'

function discordFetch(): typeof fetch {
  return (globalThis as { __discordFetch?: typeof fetch }).__discordFetch ?? fetch
}

function sessionCookieOpts() {
  const e = env()
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax' as const,
    domain: e.COOKIE_DOMAIN,
    path: '/',
  }
}

export const auth = new Hono()
  .get('/discord/login', (c) => {
    const state = randomBytes(16).toString('hex')
    const returnTo = c.req.query('return_to') ?? '/'
    setCookie(c, 'oauth_state', state, { ...sessionCookieOpts(), maxAge: 600 })
    setCookie(c, 'oauth_return_to', returnTo, { ...sessionCookieOpts(), maxAge: 600 })
    return c.redirect(buildAuthorizeUrl(state), 302)
  })
  .get('/discord/callback', async (c) => {
    const state = c.req.query('state')
    const code = c.req.query('code')
    const cookieState = getCookie(c, 'oauth_state')
    if (!state || !code || !cookieState || state !== cookieState)
      throw new AppError(400, 'invalid_state', 'OAuth state mismatch')

    const accessToken = await exchangeCode(code, discordFetch())
    const profile = await fetchProfile(accessToken, discordFetch())

    const db = getDb()
    const [user] = await db
      .insert(schema.users)
      .values({ id: newResourceId(), discordId: profile.id, username: profile.username, avatar: profile.avatar, displayName: profile.globalName })
      .onConflictDoUpdate({
        target: schema.users.discordId,
        set: { username: profile.username, avatar: profile.avatar, updatedAt: new Date() },
      })
      .returning()

    const token = await createSession(user.id)
    const returnTo = getCookie(c, 'oauth_return_to') ?? '/'
    setCookie(c, 'session', token, { ...sessionCookieOpts(), maxAge: 30 * 24 * 60 * 60 })
    setCookie(c, 'oauth_state', '', { ...sessionCookieOpts(), maxAge: 0 })
    setCookie(c, 'oauth_return_to', '', { ...sessionCookieOpts(), maxAge: 0 })
    const safeReturn = returnTo.startsWith('/') ? returnTo : '/'
    const target = safeReturn === '/' ? env().FRONTEND_URL : `${env().FRONTEND_URL}${safeReturn}`
    return c.redirect(target, 302)
  })
  .post('/logout', async (c) => {
    const token = getCookie(c, 'session')
    if (token)
      await deleteSession(token)
    setCookie(c, 'session', '', { ...sessionCookieOpts(), maxAge: 0 })
    return c.json({ ok: true })
  })

export const me = new Hono().get('/', async (c) => {
  const token = getCookie(c, 'session')
  const user = token ? await getSessionUser(token) : null
  if (!user)
    throw new AppError(401, 'unauthorized', 'Not logged in')
  return c.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    avatar: user.avatar,
    displayName: user.displayName,
    bio: user.bio,
    profileVisibility: user.profileVisibility,
  })
})
