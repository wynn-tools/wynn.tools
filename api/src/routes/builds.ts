import type { SQL } from 'drizzle-orm'
import type { CursorData } from '../lib/pagination'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm'
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

const CLASS_VALUES = ['Assassin', 'Warrior', 'Mage', 'Archer', 'Shaman'] as const

const buildsListQuery = z.object({
  q: z.string().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'name']).optional().default('newest'),
  class: z.enum(CLASS_VALUES).optional(),
  itemId: z.coerce.number().int().positive().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
})

function buildFilterConditions(
  q: string | undefined,
  playerClass: string | undefined,
  itemId: number | undefined,
  sort: string,
  cursor: CursorData | null,
) {
  const extra: SQL[] = []
  if (q)
    extra.push(ilike(schema.builds.name, `%${q}%`))
  if (playerClass)
    extra.push(eq(schema.builds.playerClass, playerClass))
  if (itemId != null)
    extra.push(sql`${schema.builds.itemIds} @> ARRAY[${itemId}]::integer[]`)
  if (cursor) {
    if ('n' in cursor) {
      extra.push(sql`(${schema.builds.name}, ${schema.builds.id}) > (${cursor.n}, ${cursor.id})`)
    }
    else {
      const d = new Date(cursor.c)
      if (sort === 'oldest')
        extra.push(sql`(${schema.builds.createdAt}, ${schema.builds.id}) > (${d.toISOString()}, ${cursor.id})`)
      else
        extra.push(sql`(${schema.builds.createdAt}, ${schema.builds.id}) < (${d.toISOString()}, ${cursor.id})`)
    }
  }
  return extra
}

function buildOrderBy(sort: string) {
  if (sort === 'name')
    return [asc(schema.builds.name), asc(schema.builds.id)]
  if (sort === 'oldest')
    return [asc(schema.builds.createdAt), asc(schema.builds.id)]
  return [desc(schema.builds.createdAt), desc(schema.builds.id)]
}

function buildNextCursor(sort: string, row: { name: string, createdAt: Date, id: string }) {
  return sort === 'name'
    ? encodeCursor({ n: row.name, id: row.id })
    : encodeCursor({ c: row.createdAt.toISOString(), id: row.id })
}

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
  .get('/', zValidator('query', buildsListQuery), async (c) => {
    const { q, sort, class: playerClass, itemId, cursor: rawCursor, limit } = c.req.valid('query')
    const cursor = decodeCursor(rawCursor)
    const filterConds = buildFilterConditions(q, playerClass, itemId, sort, cursor)
    const rows = await getDb().query.builds.findMany({
      with: { user: true },
      where: and(eq(schema.builds.visibility, 'public'), ...filterConds),
      orderBy: buildOrderBy(sort),
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore ? buildNextCursor(sort, page[page.length - 1]) : null
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
  .get('/mine', requireAuth, zValidator('query', buildsListQuery), async (c) => {
    const auth = c.get('auth')
    if (!hasScope(auth, 'builds:read'))
      throw new AppError(403, 'forbidden', 'Missing builds:read scope')
    // class and itemId filters are not exposed on /mine
    const { q, sort, cursor: rawCursor, limit } = c.req.valid('query')
    const cursor = decodeCursor(rawCursor)
    const filterConds = buildFilterConditions(q, undefined, undefined, sort, cursor)
    const rows = await getDb().query.builds.findMany({
      where: and(eq(schema.builds.userId, auth.user.id), ...filterConds),
      orderBy: buildOrderBy(sort),
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore ? buildNextCursor(sort, page[page.length - 1]) : null
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

export const userBuilds = new Hono().get('/:id/builds', zValidator('query', buildsListQuery), async (c) => {
  const userId = c.req.param('id')
  const { q, sort, class: playerClass, itemId, cursor: rawCursor, limit } = c.req.valid('query')
  const cursor = decodeCursor(rawCursor)
  const filterConds = buildFilterConditions(q, playerClass, itemId, sort, cursor)
  const rows = await getDb().query.builds.findMany({
    with: { user: true },
    where: and(eq(schema.builds.userId, userId), eq(schema.builds.visibility, 'public'), ...filterConds),
    orderBy: buildOrderBy(sort),
    limit: limit + 1,
  })
  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const next = hasMore ? buildNextCursor(sort, page[page.length - 1]) : null
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
