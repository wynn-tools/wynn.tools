import type { SQL } from 'drizzle-orm'
import type { CursorData } from '../lib/pagination'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, exists, ilike, inArray, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { getDb, schema } from '../db/client'
import { env } from '../env'
import { normalizeTags } from '../lib/build-tags'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { resolveOwner } from '../lib/owner'
import { decodeCursor, DEFAULT_PAGE_SIZE, encodeCursor, MAX_PAGE_SIZE } from '../lib/pagination'
import { parseYouTubeUrl } from '../lib/youtube'
import { hasScope, requireAuth } from '../middleware/auth'
import { verifyApiKey } from '../services/api-keys'
import { decodeBuild } from '../services/build-decode'
import { setOgCache } from '../services/og-cache'
import { createOgFetcher } from '../services/og-fetcher'
import { getSessionUser } from '../services/sessions'

function prewarmBuildOg(id: string): void {
  void (async () => {
    try {
      const fetcher = createOgFetcher(env().FRONTEND_URL)
      const { data, contentType } = await fetcher.fetchOgImage(`/b/${id}`)
      await setOgCache(`build:${id}`, data, contentType)
    }
    catch {
      // non-fatal — /v1/og/build/:id will generate on first request
    }
  })()
}

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
  tags: z.array(z.string()).max(64).optional(),
  notes: z.string().max(8000).nullable().optional(),
  tutorialUrl: z.string().nullable().optional(),
})

const CLASS_VALUES = ['Assassin', 'Warrior', 'Mage', 'Archer', 'Shaman'] as const

const buildsListQuery = z.object({
  q: z.string().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'name']).optional().default('newest'),
  class: z.enum(CLASS_VALUES).optional(),
  itemId: z.coerce.number().int().positive().optional(),
  gameVersion: z.string().max(40).optional(),
  creator: z.string().max(40).optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional().transform(v => Array.isArray(v) ? v.slice(0, 8) : v ? [v] : []),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
})

// /mine doesn't expose class, itemId, or creator filters
const mineListQuery = buildsListQuery.omit({ class: true, itemId: true, creator: true })

interface ListFilterInput {
  q?: string
  playerClass?: string
  itemId?: number
  gameVersion?: string
  creator?: string
  tags?: string[]
}

function buildFilterConditions(
  input: ListFilterInput,
  sort: string,
  cursor: CursorData | null,
) {
  const { q, playerClass, itemId, gameVersion, creator, tags } = input
  const extra: SQL[] = []
  if (q)
    extra.push(ilike(schema.builds.name, `%${q}%`))
  if (playerClass)
    extra.push(eq(schema.builds.playerClass, playerClass))
  if (itemId != null)
    extra.push(sql`${schema.builds.itemIds} @> ARRAY[${itemId}]::integer[]`)
  if (gameVersion)
    extra.push(eq(schema.builds.gameVersion, gameVersion))
  if (tags && tags.length > 0) {
    const tagList = sql.join(tags.map(t => sql`${t}`), sql`, `)
    extra.push(sql`${schema.builds.tags} @> ARRAY[${tagList}]::text[]`)
  }
  if (creator) {
    const creditMatch = exists(
      getDb()
        .select({ one: sql`1` })
        .from(schema.buildCredits)
        .where(and(
          eq(schema.buildCredits.buildId, schema.builds.id),
          eq(schema.buildCredits.userId, creator),
        )),
    )
    extra.push(or(eq(schema.builds.userId, creator), creditMatch)!)
  }
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
    const { q, sort, class: playerClass, itemId, gameVersion, creator, tag, cursor: rawCursor, limit } = c.req.valid('query')
    const cursor = decodeCursor(rawCursor)
    const filterConds = buildFilterConditions({ q, playerClass, itemId, gameVersion, creator, tags: tag }, sort, cursor)
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
        tags: r.tags ?? [],
        hasTutorial: !!r.tutorialUrl,
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
    if (row.visibility !== 'private')
      prewarmBuildOg(row.id)
    return c.json({ id: row.id }, 201)
  })
  .get('/mine', requireAuth, zValidator('query', mineListQuery), async (c) => {
    const auth = c.get('auth')
    if (!hasScope(auth, 'builds:read'))
      throw new AppError(403, 'forbidden', 'Missing builds:read scope')
    const { q, sort, gameVersion, tag, cursor: rawCursor, limit } = c.req.valid('query')
    const cursor = decodeCursor(rawCursor)
    const filterConds = buildFilterConditions({ q, gameVersion, tags: tag }, sort, cursor)
    const rows = await getDb().query.builds.findMany({
      where: and(eq(schema.builds.userId, auth.user.id), ...filterConds),
      orderBy: buildOrderBy(sort),
      limit: limit + 1,
    })
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const next = hasMore ? buildNextCursor(sort, page[page.length - 1]) : null
    return c.json({ data: page.map(r => ({ id: r.id, name: r.name, visibility: r.visibility, gameVersion: r.gameVersion, tags: r.tags ?? [], hasTutorial: !!r.tutorialUrl })), nextCursor: next })
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
    const creditRows = await getDb().query.buildCredits.findMany({
      where: (bc, { eq }) => eq(bc.buildId, build.id),
      orderBy: (bc, { asc }) => [asc(bc.position)],
      with: { user: true },
    })
    const { decoded, gameVersion, playerClass, level, equipNames } = await decodeBuild(build.buildString)
    return c.json({
      id: build.id,
      name: build.name,
      owner: resolveOwner(ownerRow),
      gameVersion,
      visibility: build.visibility,
      playerClass,
      level,
      equipNames,
      buildString: build.buildString,
      decoded,
      tags: build.tags ?? [],
      notes: build.notes,
      tutorialUrl: build.tutorialUrl,
      credits: creditRows.map(r => ({
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName ?? r.user.username,
        avatar: r.user.avatar,
      })),
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
    const next: Record<string, unknown> = { ...patch, gameVersion, playerClass, itemIds, updatedAt: new Date() }
    if (patch.tags !== undefined)
      next.tags = normalizeTags(patch.tags)
    if (patch.tutorialUrl !== undefined) {
      if (patch.tutorialUrl === null || patch.tutorialUrl === '') {
        next.tutorialUrl = null
      }
      else {
        const parsed = parseYouTubeUrl(patch.tutorialUrl)
        if (!parsed)
          throw new AppError(400, 'invalid_tutorial_url', 'Tutorial URL must be a YouTube link')
        next.tutorialUrl = parsed.canonical
      }
    }
    const [row] = await getDb().update(schema.builds).set(next).where(eq(schema.builds.id, existing.id)).returning()
    if (row.visibility !== 'private')
      prewarmBuildOg(row.id)
    return c.json({
      id: row.id,
      name: row.name,
      visibility: row.visibility,
      tags: row.tags ?? [],
      notes: row.notes,
      tutorialUrl: row.tutorialUrl,
    })
  })
  .delete('/:id', requireAuth, async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Build not found')
    await getDb().delete(schema.builds).where(eq(schema.builds.id, existing.id))
    return c.json({ ok: true })
  })
  .put('/:id/credits', requireAuth, zValidator('json', z.object({
    credits: z.array(z.object({ userId: z.string().min(1) })).max(10),
  })), async (c) => {
    const auth = c.get('auth')
    const existing = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, c.req.param('id')) })
    if (!existing || existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Build not found')
    if (!hasScope(auth, 'builds:write'))
      throw new AppError(403, 'forbidden', 'Missing builds:write scope')
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
      await tx.delete(schema.buildCredits).where(eq(schema.buildCredits.buildId, existing.id))
      if (ordered.length > 0) {
        await tx.insert(schema.buildCredits).values(
          ordered.map((userId, position) => ({ buildId: existing.id, userId, position })),
        )
      }
    })

    const rows = await getDb().query.buildCredits.findMany({
      where: (bc, { eq }) => eq(bc.buildId, existing.id),
      orderBy: (bc, { asc }) => [asc(bc.position)],
      with: { user: true },
    })

    if (existing.visibility !== 'private')
      prewarmBuildOg(existing.id)

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
    const buildId = c.req.param('id')
    const existing = await getDb().query.builds.findFirst({ where: (b, { eq }) => eq(b.id, buildId) })
    if (!existing)
      throw new AppError(404, 'not_found', 'Build not found')
    if (existing.visibility === 'private' && existing.userId !== auth.user.id)
      throw new AppError(404, 'not_found', 'Build not found')
    const deleted = await getDb().delete(schema.buildCredits).where(and(eq(schema.buildCredits.buildId, buildId), eq(schema.buildCredits.userId, auth.user.id))).returning({ userId: schema.buildCredits.userId })
    if (deleted.length === 0)
      throw new AppError(404, 'not_found', 'Not credited on this build')
    if (existing.visibility !== 'private')
      prewarmBuildOg(existing.id)
    return c.json({ ok: true })
  })

export const userBuilds = new Hono().get('/:id/builds', zValidator('query', buildsListQuery), async (c) => {
  const userId = c.req.param('id')
  const { q, sort, class: playerClass, itemId, gameVersion, tag, cursor: rawCursor, limit } = c.req.valid('query')
  const cursor = decodeCursor(rawCursor)
  const filterConds = buildFilterConditions({ q, playerClass, itemId, gameVersion, tags: tag }, sort, cursor)
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
      tags: r.tags ?? [],
      hasTutorial: !!r.tutorialUrl,
    })),
    nextCursor: next,
  })
})
