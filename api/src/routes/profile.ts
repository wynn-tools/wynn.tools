import type { MiddlewareHandler } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'
import { requireAuth } from '../middleware/auth'

const sessionOnly: MiddlewareHandler = async (c, next) => {
  if (!c.get('auth').capabilities.includes('*'))
    throw new AppError(403, 'forbidden', 'Profile management requires a session')
  await next()
}

const patchProfileBody = z.object({
  displayName: z.string().min(1).max(50).nullable().optional(),
  bio: z.string().max(200).nullable().optional(),
  profileVisibility: z.enum(schema.profileVisibility).optional(),
})

const searchQuery = z.object({
  q: z.string().min(2).max(40),
})

export const userProfile = new Hono()
  .get('/search', zValidator('query', searchQuery), async (c) => {
    const { q } = c.req.valid('query')
    const needle = `%${q.replace(/[%_]/g, m => `\\${m}`)}%`
    const rows = await getDb().query.users.findMany({
      where: (u, { and, or, ne, ilike }) => and(
        ne(u.profileVisibility, 'private'),
        or(ilike(u.username, needle), ilike(u.displayName, needle)),
      ),
      orderBy: (u, { asc }) => [asc(sql`length(${u.username})`), asc(u.username)],
      limit: 8,
    })
    return c.json({
      data: rows.map(u => ({
        id: u.id,
        username: u.username,
        name: u.displayName ?? u.username,
        avatar: u.avatar,
      })),
    })
  })
  .get('/:slug', async (c) => {
    const slug = c.req.param('slug')
    const db = getDb()
    let user = await db.query.users.findFirst({
      where: (u, { sql: s }) => s`lower(${u.username}) = lower(${slug})`,
    })
    let resolvedVia: 'username' | 'id' = 'username'
    if (!user) {
      user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, slug) })
      resolvedVia = 'id'
    }
    if (!user)
      throw new AppError(404, 'not_found', 'User not found')
    if (user.profileVisibility === 'private')
      return c.json({ private: true })
    return c.json({
      id: user.id,
      username: user.username,
      name: user.displayName ?? user.username,
      bio: user.bio,
      avatar: user.avatar,
      discordId: user.discordId,
      kind: user.kind,
      profileUrl: user.profileUrl,
      canonicalSlug: user.username,
      resolvedVia,
    })
  })

export const meProfile = new Hono()
  .use('*', requireAuth, sessionOnly)
  .patch('/', zValidator('json', patchProfileBody), async (c) => {
    const auth = c.get('auth')
    const patch = c.req.valid('json')
    const [updated] = await getDb()
      .update(schema.users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.users.id, auth.user.id))
      .returning()
    return c.json({
      displayName: updated.displayName,
      bio: updated.bio,
      profileVisibility: updated.profileVisibility,
    })
  })
