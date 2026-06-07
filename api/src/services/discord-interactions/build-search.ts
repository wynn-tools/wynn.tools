import { and, eq, ilike, sql } from 'drizzle-orm'
import { getDb } from '../../db/client'
import * as schema from '../../db/schema'
import { users } from '../../db/schema'
import { normalizeTags } from '../../lib/build-tags'

export interface BuildSearchFilters {
  discordUserId?: string
  playerClass?: string
  itemId?: number
  nameQuery?: string
  tag?: string
}

export interface BuildSearchResult {
  id: string
  name: string
  playerClass: string | null
  gameVersion: string
  createdAt: Date
  tags: string[]
  hasTutorial: boolean
  owner: { username: string, displayName: string | null } | null
}

const PAGE_SIZE = 10

export async function searchBuilds(filters: BuildSearchFilters, page: number): Promise<{
  results: BuildSearchResult[]
  total: number
  unlinkedUser: boolean
}> {
  let userId: string | undefined
  if (filters.discordUserId) {
    const owner = await getDb().query.users.findFirst({ where: eq(users.discordId, filters.discordUserId) })
    if (!owner)
      return { results: [], total: 0, unlinkedUser: true }
    userId = owner.id
  }

  const conds = [eq(schema.builds.visibility, 'public')]
  if (userId)
    conds.push(eq(schema.builds.userId, userId))
  if (filters.playerClass)
    conds.push(eq(schema.builds.playerClass, filters.playerClass))
  if (filters.itemId !== undefined)
    conds.push(sql`${schema.builds.itemIds} @> ARRAY[${filters.itemId}]::integer[]`)
  if (filters.nameQuery)
    conds.push(ilike(schema.builds.name, `%${filters.nameQuery}%`))
  if (filters.tag) {
    const [slug] = normalizeTags([filters.tag])
    if (!slug)
      return { results: [], total: 0, unlinkedUser: false }
    conds.push(sql`${schema.builds.tags} @> ARRAY[${slug}]::text[]`)
  }

  const where = and(...conds)
  const [countRow] = await getDb().select({ n: sql<number>`count(*)::int` }).from(schema.builds).where(where)
  const total = countRow?.n ?? 0

  const rows = await getDb().query.builds.findMany({
    where,
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    columns: { id: true, name: true, playerClass: true, gameVersion: true, createdAt: true, tags: true, tutorialUrl: true },
    with: { user: { columns: { username: true, displayName: true } } },
  })

  const results: BuildSearchResult[] = rows.map(r => ({
    id: r.id,
    name: r.name,
    playerClass: r.playerClass,
    gameVersion: r.gameVersion,
    createdAt: r.createdAt,
    tags: r.tags ?? [],
    hasTutorial: !!r.tutorialUrl,
    owner: r.user ? { username: r.user.username, displayName: r.user.displayName } : null,
  }))

  return { results, total, unlinkedUser: false }
}

export const BUILDS_PAGE_SIZE = PAGE_SIZE

export function encodeFilters(filters: BuildSearchFilters, page: number): string {
  const working: BuildSearchFilters = { ...filters }
  const prefix = 'builds:'
  const build = (): string => {
    const params = new URLSearchParams()
    if (working.discordUserId)
      params.set('u', working.discordUserId)
    if (working.playerClass)
      params.set('c', working.playerClass)
    if (working.itemId !== undefined)
      params.set('i', String(working.itemId))
    if (working.nameQuery)
      params.set('n', working.nameQuery)
    if (working.tag)
      params.set('t', working.tag)
    params.set('p', String(page))
    return params.toString()
  }
  let body = build()
  while (prefix.length + body.length > 100 && working.nameQuery && working.nameQuery.length > 1) {
    working.nameQuery = working.nameQuery.slice(0, -1)
    body = build()
  }
  return prefix + body
}

export function decodeFilters(customId: string): { filters: BuildSearchFilters, page: number } | null {
  if (!customId.startsWith('builds:'))
    return null
  const params = new URLSearchParams(customId.slice('builds:'.length))
  return {
    page: Number.parseInt(params.get('p') ?? '0', 10) || 0,
    filters: {
      discordUserId: params.get('u') ?? undefined,
      playerClass: params.get('c') ?? undefined,
      itemId: params.get('i') ? Number.parseInt(params.get('i')!, 10) : undefined,
      nameQuery: params.get('n') ?? undefined,
      tag: params.get('t') ?? undefined,
    },
  }
}
