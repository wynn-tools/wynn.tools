import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, MAX_PAGE_SIZE } from '../lib/pagination'
import { hasScope, requireAuth } from '../middleware/auth'
import { verifyApiKey } from '../services/api-keys'
import { getSessionUser } from '../services/sessions'

const visibilityEnum = z.enum(schema.visibility)
const createBody = z.object({
  name: z.string().min(1).max(100),
  itemData: z.record(z.string(), z.unknown()),
  gameVersion: z.string().min(1),
  visibility: visibilityEnum.optional(),
})
const patchBody = z.object({
  name: z.string().min(1).max(100).optional(),
  visibility: visibilityEnum.optional(),
})

async function resolveViewerId(cookieHeader?: string, authHeader?: string): Promise<string | null> {
  const bearer = authHeader?.match(/^Bearer (\S+)$/i)?.[1]
  if (bearer) {
    const v = await verifyApiKey(bearer)
    if (v)
      return v.user.id
  }
  const token = cookieHeader?.match(/session=([^;]+)/)?.[1]
  if (token) {
    const u = await getSessionUser(token)
    if (u)
      return u.id
  }
  return null
}

export const items = new Hono()
  .get('/', async (c) => {
    const limit = Math.min(Number(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const cursor = decodeCursor(c.req.query('cursor'))
    const rows = await getDb().query.craftedItems.findMany({
      where: (i, { and, eq, lt, or }) => and(
        eq(i.visibility, 'public'),
        cursor
          ? or(lt(i.createdAt, cursor.createdAt), and(eq(i.createdAt, cursor.createdAt), lt(i.id, cursor.id)))
          : undefined,
      ),
      orderBy: (i, { desc }) => [desc(i.createdAt), desc(i.id)],
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore
      ? encodeCursor({ createdAt: page[page.length - 1].createdAt, id: page[page.length - 1].id })
      : null
    return c.json({ data: page.map(r => ({ id: r.id, name: r.name, gameVersion: r.gameVersion })), nextCursor: next })
  })
  .post('/', requireAuth, zValidator('json', createBody), async (c) => {
    const auth = c.get('auth')
    if (!hasScope(auth, 'items:write'))
      throw new AppError(403, 'forbidden', 'Missing items:write scope')
    const { name, itemData, gameVersion, visibility } = c.req.valid('json')
    const [row] = await getDb().insert(schema.craftedItems).values({
      id: newResourceId(),
      userId: auth.user.id,
      name,
      itemData,
      gameVersion,
      visibility: visibility ?? 'private',
    }).returning()
    return c.json({ id: row.id }, 201)
  })
  .get('/mine', requireAuth, async (c) => {
    const auth = c.get('auth')
    if (!hasScope(auth, 'items:read'))
      throw new AppError(403, 'forbidden', 'Missing items:read scope')
    const rows = await getDb().query.craftedItems.findMany({
      where: (i, { eq }) => eq(i.userId, auth.user.id),
      orderBy: (i, { desc }) => [desc(i.createdAt)],
      limit: DEFAULT_PAGE_SIZE,
    })
    return c.json(rows.map(r => ({ id: r.id, name: r.name, visibility: r.visibility, gameVersion: r.gameVersion })))
  })
  .get('/:id', async (c) => {
    const item = await getDb().query.craftedItems.findFirst({ where: (i, { eq }) => eq(i.id, c.req.param('id')) })
    if (!item)
      throw new AppError(404, 'not_found', 'Item not found')
    if (item.visibility === 'private') {
      const viewerId = await resolveViewerId(c.req.header('cookie'), c.req.header('authorization'))
      if (viewerId !== item.userId)
        throw new AppError(404, 'not_found', 'Item not found')
    }
    const owner = await getDb().query.users.findFirst({ where: (u, { eq }) => eq(u.id, item.userId) })
    return c.json({
      id: item.id,
      name: item.name,
      owner: owner ? { id: owner.id, username: owner.username } : null,
      gameVersion: item.gameVersion,
      visibility: item.visibility,
      itemData: item.itemData,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  })
  .patch('/:id', requireAuth, zValidator('json', patchBody), async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.craftedItems.findFirst({ where: (i, { eq }) => eq(i.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Item not found')
    if (!hasScope(auth, 'items:write'))
      throw new AppError(403, 'forbidden', 'Missing items:write scope')
    const [row] = await getDb().update(schema.craftedItems).set({ ...c.req.valid('json'), updatedAt: new Date() }).where(eq(schema.craftedItems.id, existing.id)).returning()
    return c.json({ id: row.id, name: row.name, visibility: row.visibility })
  })
  .delete('/:id', requireAuth, async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.craftedItems.findFirst({ where: (i, { eq }) => eq(i.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Item not found')
    await getDb().delete(schema.craftedItems).where(eq(schema.craftedItems.id, existing.id))
    return c.json({ ok: true })
  })

export const userItems = new Hono().get('/:id/items', async (c) => {
  const userId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  const cursor = decodeCursor(c.req.query('cursor'))
  const rows = await getDb().query.craftedItems.findMany({
    where: (i, { and, eq, lt, or }) => and(
      eq(i.userId, userId),
      eq(i.visibility, 'public'),
      cursor
        ? or(lt(i.createdAt, cursor.createdAt), and(eq(i.createdAt, cursor.createdAt), lt(i.id, cursor.id)))
        : undefined,
    ),
    orderBy: (i, { desc }) => [desc(i.createdAt), desc(i.id)],
    limit: limit + 1,
  })
  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const next = hasMore
    ? encodeCursor({ createdAt: page[page.length - 1].createdAt, id: page[page.length - 1].id })
    : null
  return c.json({ data: page.map(r => ({ id: r.id, name: r.name, gameVersion: r.gameVersion })), nextCursor: next })
})
