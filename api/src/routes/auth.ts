import { randomBytes } from 'node:crypto'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { env } from '../env'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { requireAuth } from '../middleware/auth'
import { addGuildMember, buildAuthorizeUrl, buildJoinAuthorizeUrl, DiscordJoinError, exchangeCode, fetchProfile } from '../services/discord'
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

function appendQuery(target: string, key: string, value: string): string {
  const sep = target.includes('?') ? '&' : '?'
  return `${target}${sep}${key}=${encodeURIComponent(value)}`
}

export const auth = new Hono()
  .get('/discord/login', (c) => {
    const state = randomBytes(16).toString('hex')
    const returnTo = c.req.query('return_to') ?? '/'
    setCookie(c, 'oauth_state', state, { ...sessionCookieOpts(), maxAge: 600 })
    setCookie(c, 'oauth_return_to', returnTo, { ...sessionCookieOpts(), maxAge: 600 })
    // Clear any stale join-intent from a previous flow
    setCookie(c, 'oauth_join_intent', '', { ...sessionCookieOpts(), maxAge: 0 })
    return c.redirect(buildAuthorizeUrl(state), 302)
  })
  .get('/discord/join', async (c) => {
    const token = getCookie(c, 'session')
    const user = token ? await getSessionUser(token) : null
    if (!user)
      return c.redirect('/v1/auth/discord/login?return_to=%2F%3Fintent%3Djoin', 302)

    const state = randomBytes(16).toString('hex')
    const returnTo = c.req.query('return_to') ?? '/'
    setCookie(c, 'oauth_state', state, { ...sessionCookieOpts(), maxAge: 600 })
    setCookie(c, 'oauth_return_to', returnTo, { ...sessionCookieOpts(), maxAge: 600 })
    setCookie(c, 'oauth_join_intent', '1', { ...sessionCookieOpts(), maxAge: 600 })
    return c.redirect(buildJoinAuthorizeUrl(state), 302)
  })
  .get('/discord/callback', async (c) => {
    const state = c.req.query('state')
    const code = c.req.query('code')
    const cookieState = getCookie(c, 'oauth_state')
    const joinIntent = getCookie(c, 'oauth_join_intent') === '1'
    if (!state || !code || !cookieState || state !== cookieState)
      throw new AppError(400, 'invalid_state', 'OAuth state mismatch')

    const accessToken = await exchangeCode(code, discordFetch())
    const profile = await fetchProfile(accessToken, discordFetch())

    const db = getDb()

    const existingReal = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.discordId, profile.id),
    })
    if (!existingReal) {
      const slugHolder = await db.query.users.findFirst({
        where: (u, { sql, and, ne }) => and(
          sql`lower(${u.username}) = lower(${profile.username})`,
          ne(u.kind, 'real'),
        ),
      })
      if (slugHolder)
        throw new AppError(409, 'slug_reserved', `The handle '${profile.username}' is reserved for an imported build creator. Contact an admin to claim it, or sign in with a different Discord account.`)
    }

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
    setCookie(c, 'oauth_join_intent', '', { ...sessionCookieOpts(), maxAge: 0 })

    const safeReturn = returnTo.startsWith('/') ? returnTo : '/'
    const frontend = env().FRONTEND_URL.replace(/\/$/, '')
    let target = `${frontend}${safeReturn}`

    if (joinIntent) {
      try {
        await addGuildMember(accessToken, profile.id, discordFetch())
        await db
          .update(schema.users)
          .set({ discordJoinStatus: 'joined', discordJoinedAt: new Date() })
          .where(eq(schema.users.id, user.id))
      }
      catch (err) {
        if (!(err instanceof DiscordJoinError))
          throw err
        target = appendQuery(target, 'discord_join', 'error')
      }
    }
    else if (user.discordJoinStatus === 'unset') {
      target = `${frontend}/welcome?return_to=${encodeURIComponent(safeReturn)}`
    }

    return c.redirect(target, 302)
  })
  .post('/logout', async (c) => {
    const token = getCookie(c, 'session')
    if (token)
      await deleteSession(token)
    setCookie(c, 'session', '', { ...sessionCookieOpts(), maxAge: 0 })
    return c.json({ ok: true })
  })

const promptBody = z.object({ action: z.literal('declined') })

export const me = new Hono()
  .get('/', async (c) => {
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
      discordJoinStatus: user.discordJoinStatus,
    })
  })
  .post('/discord-prompt', requireAuth, zValidator('json', promptBody), async (c) => {
    const auth = c.get('auth')
    const { action } = c.req.valid('json')
    await getDb()
      .update(schema.users)
      .set({ discordJoinStatus: action })
      .where(eq(schema.users.id, auth.user.id))
    return c.json({ ok: true })
  })
