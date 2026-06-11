import { Buffer } from 'node:buffer'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { getDb, schema } from '../db/client'

export interface ListFilters {
  kind?: 'infobox' | 'custom-bar' | 'bundle'
  class?: 'mage' | 'archer' | 'warrior' | 'shaman' | 'assassin'
  category?: 'combat' | 'party-ui' | 'raid' | 'lootrun' | 'dps-meter' | 'cooldown-tracker' | 'resource-tracker' | 'qol'
  q?: string
  creator?: string
}

export type Sort = 'latest-activity' | 'most-installed' | 'most-reacted' | 'newest' | 'recently-updated'

export interface ListItem {
  id: string
  slug: string
  title: string
  description: string
  kind: string
  classes: string[]
  category: string
  installCount: number
  reactionCounts: unknown
  lastActivityAt: Date
  createdAt: Date
  updatedAt: Date
  authorId: string
}

export async function listCreations(
  filters: ListFilters,
  sort: Sort,
  limit: number,
  cursor: string | null,
): Promise<{ items: ListItem[], nextCursor: string | null }> {
  const c = schema.stockCreation
  const v = schema.stockVersion

  const hasPublished = sql<boolean>`exists (
    select 1 from ${v}
    where ${v.creationId} = ${c.id} and ${v.status} = 'published'
  )`

  const conditions = [isNull(c.deletedAt), hasPublished]
  if (filters.kind)
    conditions.push(eq(c.kind, filters.kind))
  if (filters.category)
    conditions.push(eq(c.category, filters.category))
  if (filters.class)
    conditions.push(sql`${filters.class} = ANY(${c.classes})`)
  if (filters.creator)
    conditions.push(sql`${c.authorUserId} = ${filters.creator}`)
  if (filters.q)
    conditions.push(sql`${c.searchTsv} @@ plainto_tsquery('english', ${filters.q})`)

  let orderBy
  switch (sort) {
    case 'most-installed':
      orderBy = [desc(c.installCount), desc(c.id)]
      break
    case 'most-reacted':
      orderBy = [desc(sql`coalesce((${c.reactionCounts}->>'total')::int, 0)`), desc(c.id)]
      break
    case 'newest':
      orderBy = [desc(c.createdAt), desc(c.id)]
      break
    case 'recently-updated':
      orderBy = [desc(c.updatedAt), desc(c.id)]
      break
    case 'latest-activity':
    default:
      orderBy = [desc(c.lastActivityAt), desc(c.id)]
  }

  if (cursor) {
    const [ts, id] = decodeCursor(cursor)
    const tsCol = sortColumn(sort, c)
    conditions.push(sql`(${tsCol}, ${c.id}) < (${ts}, ${id})`)
  }

  const rows = await getDb()
    .select({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      kind: c.kind,
      classes: c.classes,
      category: c.category,
      installCount: c.installCount,
      reactionCounts: c.reactionCounts,
      lastActivityAt: c.lastActivityAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      authorId: c.authorUserId,
    })
    .from(c)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit + 1)

  const items = rows.slice(0, limit) as ListItem[]
  const next = rows.length > limit
    ? encodeCursor(sortColumnValue(sort, items[items.length - 1]), items[items.length - 1].id)
    : null
  return { items, nextCursor: next }
}

function sortColumn(sort: Sort, c: typeof schema.stockCreation) {
  switch (sort) {
    case 'most-installed': return c.installCount
    case 'newest': return c.createdAt
    case 'recently-updated': return c.updatedAt
    case 'latest-activity':
    case 'most-reacted':
    default: return c.lastActivityAt
  }
}

function sortColumnValue(sort: Sort, row: ListItem): string {
  switch (sort) {
    case 'most-installed': return String(row.installCount)
    case 'newest': return row.createdAt.toISOString()
    case 'recently-updated': return row.updatedAt.toISOString()
    default: return row.lastActivityAt.toISOString()
  }
}

function encodeCursor(ts: string, id: string): string {
  return Buffer.from(JSON.stringify([ts, id])).toString('base64url')
}
function decodeCursor(cur: string): [string, string] {
  return JSON.parse(Buffer.from(cur, 'base64url').toString('utf8'))
}

export async function getCreationBySlug(slug: string) {
  const c = await getDb().query.stockCreation.findFirst({
    where: (c, { and, eq, isNull }) => and(eq(c.slug, slug), isNull(c.deletedAt)),
    with: {
      author: { columns: { id: true, username: true, displayName: true, avatar: true } },
      versions: {
        where: (v, { eq }) => eq(v.status, 'published'),
        orderBy: (v, { desc }) => [desc(v.number)],
        with: { parts: { orderBy: (p, { asc }) => [asc(p.order)] } },
        limit: 1,
      },
      media: { orderBy: (m, { asc }) => [asc(m.order)] },
    },
  })
  if (!c)
    return null
  const [latest] = c.versions
  return { ...c, latestVersion: latest ?? null, versions: undefined }
}

export async function getVersion(slug: string, number: number) {
  const creation = await getDb().query.stockCreation.findFirst({
    where: (c, { and, eq, isNull }) => and(eq(c.slug, slug), isNull(c.deletedAt)),
    columns: { id: true },
  })
  if (!creation)
    return null
  const version = await getDb().query.stockVersion.findFirst({
    where: (v, { and, eq }) => and(
      eq(v.creationId, creation.id),
      eq(v.number, number),
      eq(v.status, 'published'),
    ),
    with: { parts: { orderBy: (p, { asc }) => [asc(p.order)] } },
  })
  return version ?? null
}

export async function getRawPart(slug: string, versionNumber: number, partId: string) {
  const row = await getDb()
    .select({
      creationId: schema.stockCreation.id,
      role: schema.stockPart.role,
      textContent: schema.stockPart.textContent,
      blobSha256: schema.stockPart.blobSha256,
      blobFilename: schema.stockPart.blobFilename,
    })
    .from(schema.stockPart)
    .innerJoin(schema.stockVersion, eq(schema.stockVersion.id, schema.stockPart.versionId))
    .innerJoin(schema.stockCreation, eq(schema.stockCreation.id, schema.stockVersion.creationId))
    .where(and(
      eq(schema.stockCreation.slug, slug),
      eq(schema.stockVersion.number, versionNumber),
      eq(schema.stockVersion.status, 'published'),
      eq(schema.stockPart.id, partId),
      isNull(schema.stockCreation.deletedAt),
    ))
    .limit(1)
  return row[0] ?? null
}
