import type { SQL } from 'drizzle-orm'
import type { CursorData } from '../lib/pagination'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { normalizeTags } from '../lib/build-tags'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { resolveOwner } from '../lib/owner'
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
  tags: z.array(z.string()).max(64).optional(),
  notes: z.string().max(8000).nullable().optional(),
})

const itemsListQuery = z.object({
  q: z.string().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'name']).optional().default('newest'),
  tag: z.union([z.string(), z.array(z.string())]).optional().transform(v => Array.isArray(v) ? v.slice(0, 8) : v ? [v] : []),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
})

interface ItemFilterInput {
  q?: string
  tags?: string[]
}

function itemFilterConditions(
  input: ItemFilterInput,
  sort: string,
  cursor: CursorData | null,
): SQL[] {
  const { q, tags } = input
  const extra: SQL[] = []
  if (q)
    extra.push(ilike(schema.craftedItems.name, `%${q}%`))
  if (tags && tags.length > 0) {
    const tagList = sql.join(tags.map(t => sql`${t}`), sql`, `)
    extra.push(sql`${schema.craftedItems.tags} @> ARRAY[${tagList}]::text[]`)
  }
  if (cursor) {
    if ('n' in cursor) {
      extra.push(sql`(${schema.craftedItems.name}, ${schema.craftedItems.id}) > (${cursor.n}, ${cursor.id})`)
    }
    else {
      const d = new Date(cursor.c)
      if (sort === 'oldest')
        extra.push(sql`(${schema.craftedItems.createdAt}, ${schema.craftedItems.id}) > (${d.toISOString()}, ${cursor.id})`)
      else
        extra.push(sql`(${schema.craftedItems.createdAt}, ${schema.craftedItems.id}) < (${d.toISOString()}, ${cursor.id})`)
    }
  }
  return extra
}

function itemOrderBy(sort: string) {
  if (sort === 'name')
    return [asc(schema.craftedItems.name), asc(schema.craftedItems.id)]
  if (sort === 'oldest')
    return [asc(schema.craftedItems.createdAt), asc(schema.craftedItems.id)]
  return [desc(schema.craftedItems.createdAt), desc(schema.craftedItems.id)]
}

function itemNextCursor(sort: string, row: { name: string, createdAt: Date, id: string }) {
  return sort === 'name'
    ? encodeCursor({ n: row.name, id: row.id })
    : encodeCursor({ c: row.createdAt.toISOString(), id: row.id })
}

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
  .get('/', zValidator('query', itemsListQuery), async (c) => {
    const { q, sort, tag, cursor: rawCursor, limit } = c.req.valid('query')
    const cursor = decodeCursor(rawCursor)
    const filterConds = itemFilterConditions({ q, tags: tag }, sort, cursor)
    const rows = await getDb().query.craftedItems.findMany({
      with: { user: true },
      where: and(eq(schema.craftedItems.visibility, 'public'), ...filterConds),
      orderBy: itemOrderBy(sort),
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore ? itemNextCursor(sort, page[page.length - 1]) : null
    return c.json({
      data: page.map(r => ({
        id: r.id,
        name: r.name,
        gameVersion: r.gameVersion,
        owner: resolveOwner(r.user),
        craftHash: (r.itemData as { craftHash?: string } | null)?.craftHash ?? null,
        tags: r.tags ?? [],
      })),
      nextCursor: next,
    })
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
  .get('/mine', requireAuth, zValidator('query', itemsListQuery), async (c) => {
    const auth = c.get('auth')
    if (!hasScope(auth, 'items:read'))
      throw new AppError(403, 'forbidden', 'Missing items:read scope')
    const { q, sort, tag, cursor: rawCursor, limit } = c.req.valid('query')
    const cursor = decodeCursor(rawCursor)
    const filterConds = itemFilterConditions({ q, tags: tag }, sort, cursor)
    const rows = await getDb().query.craftedItems.findMany({
      where: and(eq(schema.craftedItems.userId, auth.user.id), ...filterConds),
      orderBy: itemOrderBy(sort),
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore ? itemNextCursor(sort, page[page.length - 1]) : null
    return c.json({
      data: page.map(r => ({
        id: r.id,
        name: r.name,
        visibility: r.visibility,
        gameVersion: r.gameVersion,
        craftHash: (r.itemData as { craftHash?: string } | null)?.craftHash ?? null,
        tags: r.tags ?? [],
      })),
      nextCursor: next,
    })
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
    const ownerRow = await getDb().query.users.findFirst({ where: (u, { eq }) => eq(u.id, item.userId) })
    const creditRows = await getDb().query.craftedItemCredits.findMany({
      where: (cc, { eq }) => eq(cc.itemId, item.id),
      orderBy: (cc, { asc }) => [asc(cc.position)],
      with: { user: true },
    })
    return c.json({
      id: item.id,
      name: item.name,
      owner: resolveOwner(ownerRow),
      gameVersion: item.gameVersion,
      visibility: item.visibility,
      itemData: item.itemData,
      tags: item.tags ?? [],
      notes: item.notes,
      credits: creditRows.map(r => ({
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName ?? r.user.username,
        avatar: r.user.avatar,
      })),
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
    const patch = c.req.valid('json')
    const next: Record<string, unknown> = { ...patch, updatedAt: new Date() }
    if (patch.tags !== undefined)
      next.tags = normalizeTags(patch.tags)
    const [row] = await getDb().update(schema.craftedItems).set(next).where(eq(schema.craftedItems.id, existing.id)).returning()
    return c.json({
      id: row.id,
      name: row.name,
      visibility: row.visibility,
      tags: row.tags ?? [],
      notes: row.notes,
    })
  })
  .delete('/:id', requireAuth, async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.craftedItems.findFirst({ where: (i, { eq }) => eq(i.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Item not found')
    await getDb().delete(schema.craftedItems).where(eq(schema.craftedItems.id, existing.id))
    return c.json({ ok: true })
  })
  .put('/:id/credits', requireAuth, zValidator('json', z.object({
    credits: z.array(z.object({ userId: z.string().min(1) })).max(10),
  })), async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.craftedItems.findFirst({ where: (i, { eq }) => eq(i.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Item not found')
    if (!hasScope(auth, 'items:write'))
      throw new AppError(403, 'forbidden', 'Missing items:write scope')
    const { credits } = c.req.valid('json')

    const seen = new Set<string>()
    const ordered: string[] = []
    for (const { userId } of credits) {
      if (seen.has(userId))
        continue
      if (userId === existing.userId)
        throw new AppError(400, 'owner_not_creditable', 'Owner cannot be in credits')
      seen.add(userId)
      ordered.push(userId)
    }

    if (ordered.length > 0) {
      const found = await getDb().query.users.findMany({
        where: inArray(schema.users.id, ordered),
        columns: { id: true },
      })
      if (found.length !== ordered.length)
        throw new AppError(400, 'unknown_user', 'One or more userIds do not exist')
    }

    await getDb().transaction(async (tx) => {
      await tx.delete(schema.craftedItemCredits).where(eq(schema.craftedItemCredits.itemId, existing.id))
      if (ordered.length > 0) {
        await tx.insert(schema.craftedItemCredits).values(
          ordered.map((userId, position) => ({ itemId: existing.id, userId, position })),
        )
      }
    })

    const rows = await getDb().query.craftedItemCredits.findMany({
      where: (cc, { eq }) => eq(cc.itemId, existing.id),
      orderBy: (cc, { asc }) => [asc(cc.position)],
      with: { user: true },
    })

    return c.json({
      credits: rows.map(r => ({
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName ?? r.user.username,
        avatar: r.user.avatar,
      })),
    })
  })
  .delete('/:id/credits/me', requireAuth, async (c) => {
    const auth = c.get('auth')
    const itemId = c.req.param('id')
    const existing = await getDb().query.craftedItems.findFirst({ where: (i, { eq }) => eq(i.id, itemId) })
    if (!existing)
      throw new AppError(404, 'not_found', 'Item not found')
    if (existing.visibility === 'private' && existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Item not found')
    const deleted = await getDb().delete(schema.craftedItemCredits).where(and(eq(schema.craftedItemCredits.itemId, itemId), eq(schema.craftedItemCredits.userId, auth.user.id))).returning({ userId: schema.craftedItemCredits.userId })
    if (deleted.length === 0)
      throw new AppError(404, 'not_found', 'Not credited on this item')
    return c.json({ ok: true })
  })

export const userItems = new Hono().get('/:id/items', zValidator('query', itemsListQuery), async (c) => {
  const userId = c.req.param('id')
  const { q, sort, tag, cursor: rawCursor, limit } = c.req.valid('query')
  const cursor = decodeCursor(rawCursor)
  const filterConds = itemFilterConditions({ q, tags: tag }, sort, cursor)
  const creditedIds = (
    await getDb()
      .select({ itemId: schema.craftedItemCredits.itemId })
      .from(schema.craftedItemCredits)
      .where(eq(schema.craftedItemCredits.userId, userId))
  ).map(r => r.itemId)
  const ownership = creditedIds.length > 0
    ? or(eq(schema.craftedItems.userId, userId), inArray(schema.craftedItems.id, creditedIds))!
    : eq(schema.craftedItems.userId, userId)
  const rows = await getDb().query.craftedItems.findMany({
    with: { user: true },
    where: and(
      ownership,
      eq(schema.craftedItems.visibility, 'public'),
      ...filterConds,
    ),
    orderBy: itemOrderBy(sort),
    limit: limit + 1,
  })
  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const next = hasMore ? itemNextCursor(sort, page[page.length - 1]) : null
  return c.json({
    data: page.map(r => ({
      id: r.id,
      name: r.name,
      gameVersion: r.gameVersion,
      owner: resolveOwner(r.user),
      craftHash: (r.itemData as { craftHash?: string } | null)?.craftHash ?? null,
      tags: r.tags ?? [],
      isCredit: r.userId !== userId,
    })),
    nextCursor: next,
  })
})
