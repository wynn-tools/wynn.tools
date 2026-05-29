import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { resolveOwner } from '../lib/owner'
import { decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, MAX_PAGE_SIZE } from '../lib/pagination'
import { hasScope, requireAuth } from '../middleware/auth'
import { verifyApiKey } from '../services/api-keys'
import { decodeBuild } from '../services/build-decode'
import { getSessionUser } from '../services/sessions'

const visibilityEnum = z.enum(schema.visibility)
const createBody = z.object({
  name: z.string().min(1).max(100),
  buildString: z.string().min(1),
  visibility: visibilityEnum.optional(),
})
const patchBody = z.object({
  name: z.string().min(1).max(100).optional(),
  buildString: z.string().min(1).optional(),
  visibility: visibilityEnum.optional(),
})

/** Resolve a viewer id from a session cookie or bearer key, or null. */
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

export const builds = new Hono()
  .get('/', async (c) => {
    const limit = Math.min(Number(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const cursor = decodeCursor(c.req.query('cursor'))
    const rows = await getDb().query.builds.findMany({
      with: { user: true },
      where: (b, { and, eq, lt, or }) => and(
        eq(b.visibility, 'public'),
        cursor && 'c' in cursor
          ? or(lt(b.createdAt, new Date(cursor.c)), and(eq(b.createdAt, new Date(cursor.c)), lt(b.id, cursor.id)))
          : undefined,
      ),
      orderBy: (b, { desc }) => [desc(b.createdAt), desc(b.id)],
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore
      ? encodeCursor({ c: page[page.length - 1].createdAt.toISOString(), id: page[page.length - 1].id })
      : null
    return c.json({
      data: page.map(r => ({
        id: r.id,
        name: r.name,
        gameVersion: r.gameVersion,
        owner: resolveOwner(r.user),
      })),
      nextCursor: next,
    })
  })
  .post('/', requireAuth, zValidator('json', createBody), async (c) => {
    const auth = c.get('auth')
    if (!hasScope(auth, 'builds:write'))
      throw new AppError(403, 'forbidden', 'Missing builds:write scope')
    const { name, buildString, visibility } = c.req.valid('json')
    const { gameVersion, playerClass, itemIds } = await decodeBuild(buildString) // throws invalid_build on garbage
    const [row] = await getDb().insert(schema.builds).values({
      id: newResourceId(),
      userId: auth.user.id,
      name,
      buildString,
      gameVersion,
      playerClass,
      itemIds,
      visibility: visibility ?? 'private',
    }).returning()
    return c.json({ id: row.id }, 201)
  })
  .get('/mine', requireAuth, async (c) => {
    const auth = c.get('auth')
    if (!hasScope(auth, 'builds:read'))
      throw new AppError(403, 'forbidden', 'Missing builds:read scope')
    const limit = Math.min(Number(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const cursor = decodeCursor(c.req.query('cursor'))
    const rows = await getDb().query.builds.findMany({
      where: (b, { and, eq, lt, or }) => and(
        eq(b.userId, auth.user.id),
        cursor && 'c' in cursor
          ? or(lt(b.createdAt, new Date(cursor.c)), and(eq(b.createdAt, new Date(cursor.c)), lt(b.id, cursor.id)))
          : undefined,
      ),
      orderBy: (b, { desc }) => [desc(b.createdAt), desc(b.id)],
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore
      ? encodeCursor({ c: page[page.length - 1].createdAt.toISOString(), id: page[page.length - 1].id })
      : null
    return c.json({ data: page.map(r => ({ id: r.id, name: r.name, visibility: r.visibility, gameVersion: r.gameVersion })), nextCursor: next })
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    const build = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, id) })
    if (!build)
      throw new AppError(404, 'not_found', 'Build not found')

    if (build.visibility === 'private') {
      const viewerId = await resolveViewerId(c.req.header('cookie'), c.req.header('authorization'))
      if (viewerId !== build.userId)
        throw new AppError(404, 'not_found', 'Build not found')
    }

    const ownerRow = await getDb().query.users.findFirst({ where: (u, { eq }) => eq(u.id, build.userId) })
    const { decoded, gameVersion } = await decodeBuild(build.buildString)
    return c.json({
      id: build.id,
      name: build.name,
      owner: resolveOwner(ownerRow),
      gameVersion,
      visibility: build.visibility,
      buildString: build.buildString,
      decoded,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
    })
  })
  .patch('/:id', requireAuth, zValidator('json', patchBody), async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Build not found')
    if (!hasScope(auth, 'builds:write'))
      throw new AppError(403, 'forbidden', 'Missing builds:write scope')
    const patch = c.req.valid('json')
    let gameVersion = existing.gameVersion
    let playerClass = existing.playerClass
    let itemIds = existing.itemIds
    if (patch.buildString) {
      const decoded = await decodeBuild(patch.buildString)
      gameVersion = decoded.gameVersion
      playerClass = decoded.playerClass
      itemIds = decoded.itemIds
    }
    const [row] = await getDb().update(schema.builds).set({ ...patch, gameVersion, playerClass, itemIds, updatedAt: new Date() }).where(eq(schema.builds.id, existing.id)).returning()
    return c.json({ id: row.id, name: row.name, visibility: row.visibility })
  })
  .delete('/:id', requireAuth, async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Build not found')
    await getDb().delete(schema.builds).where(eq(schema.builds.id, existing.id))
    return c.json({ ok: true })
  })

export const userBuilds = new Hono().get('/:id/builds', async (c) => {
  const userId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  const cursor = decodeCursor(c.req.query('cursor'))
  const rows = await getDb().query.builds.findMany({
    with: { user: true },
    where: (b, { and, eq, lt, or }) => and(
      eq(b.userId, userId),
      eq(b.visibility, 'public'),
      cursor && 'c' in cursor
        ? or(lt(b.createdAt, new Date(cursor.c)), and(eq(b.createdAt, new Date(cursor.c)), lt(b.id, cursor.id)))
        : undefined,
    ),
    orderBy: (b, { desc }) => [desc(b.createdAt), desc(b.id)],
    limit: limit + 1,
  })
  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const next = hasMore
    ? encodeCursor({ c: page[page.length - 1].createdAt.toISOString(), id: page[page.length - 1].id })
    : null
  return c.json({
    data: page.map(r => ({
      id: r.id,
      name: r.name,
      gameVersion: r.gameVersion,
      owner: resolveOwner(r.user),
    })),
    nextCursor: next,
  })
})
