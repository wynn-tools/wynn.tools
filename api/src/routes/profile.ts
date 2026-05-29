import type { MiddlewareHandler } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
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

export const userProfile = new Hono().get('/:id', async (c) => {
  const user = await getDb().query.users.findFirst({
    where: (u, { eq }) => eq(u.id, c.req.param('id')),
  })
  if (!user)
    throw new AppError(404, 'not_found', 'User not found')
  if (user.profileVisibility === 'private')
    return c.json({ private: true })
  return c.json({
    id: user.id,
    name: user.displayName ?? user.username,
    bio: user.bio,
    avatar: user.avatar,
    discordId: user.discordId,
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
