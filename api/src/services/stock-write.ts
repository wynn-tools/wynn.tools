import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { slugForTitle } from '../lib/slug'
import { createCreationThread, postVersionReply } from './stock-discord-bridge'

export interface CreateDraftCreationInput {
  userId: string
  title: string
  kind: 'infobox' | 'custom-bar' | 'bundle'
  category: 'combat' | 'party-ui' | 'raid' | 'lootrun' | 'dps-meter' | 'cooldown-tracker' | 'resource-tracker' | 'qol'
  classes: Array<'mage' | 'archer' | 'warrior' | 'shaman' | 'assassin'>
  description?: string
}

export async function createDraftCreation(input: CreateDraftCreationInput): Promise<{ id: string, slug: string }> {
  const db = getDb()
  const slug = await slugForTitle(input.title, async (s) => {
    const hit = await db.query.stockCreation.findFirst({
      where: (c, { eq }) => eq(c.slug, s),
      columns: { id: true },
    })
    return !!hit
  })
  const id = newResourceId()
  await db.transaction(async (tx) => {
    await tx.insert(schema.stockCreation).values({
      id,
      slug,
      title: input.title,
      description: input.description ?? '',
      authorUserId: input.userId,
      kind: input.kind,
      category: input.category,
      classes: input.classes,
    })
    await tx.insert(schema.stockVersion).values({
      id: newResourceId(),
      creationId: id,
      number: 1,
      label: 'v1',
      status: 'draft',
    })
  })
  return { id, slug }
}

export interface PatchCreationInput {
  title?: string
  description?: string
  kind?: 'infobox' | 'custom-bar' | 'bundle'
  category?: CreateDraftCreationInput['category']
  classes?: CreateDraftCreationInput['classes']
  creditsNote?: string
}

export async function patchCreationMeta(id: string, patch: PatchCreationInput): Promise<void> {
  const db = getDb()
  if (patch.title !== undefined) {
    const hasPublished = await db.query.stockVersion.findFirst({
      where: (v, { eq, and }) => and(eq(v.creationId, id), eq(v.status, 'published')),
      columns: { id: true },
    })
    if (hasPublished)
      throw new AppError(409, 'title_locked', 'title is immutable after first publish')
  }
  await db.update(schema.stockCreation)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.stockCreation.id, id))
}

export async function createDraftVersion(creationId: string, authorId: string, label: string): Promise<{ id: string, number: number }> {
  const db = getDb()
  const creation = await db.query.stockCreation.findFirst({
    where: (c, { eq }) => eq(c.id, creationId),
    columns: { authorUserId: true },
  })
  if (!creation)
    throw new AppError(404, 'not_found', 'creation not found')
  if (creation.authorUserId !== authorId)
    throw new AppError(403, 'forbidden', 'only the author can publish versions')

  const id = newResourceId()
  try {
    return await db.transaction(async (tx) => {
      const max = await tx
        .select({ n: sql<number>`coalesce(max(${schema.stockVersion.number}), 0)` })
        .from(schema.stockVersion)
        .where(eq(schema.stockVersion.creationId, creationId))
      const number = (max[0]?.n ?? 0) + 1
      await tx.insert(schema.stockVersion).values({
        id,
        creationId,
        number,
        label,
        status: 'draft',
      })
      return { id, number }
    })
  }
  catch (err) {
    if (/stock_version_draft_idx/.test(String(err)))
      throw new AppError(409, 'draft_exists', 'a draft version already exists; edit or publish it first')
    throw err
  }
}

export interface PartInput {
  role: 'function' | 'infobox' | 'resourcepack'
  name: string
  description?: string | null
  group?: string | null
  textContent?: string | null
  blobSha256?: string | null
  blobFilename?: string | null
}

export async function replaceDraftParts(versionId: string, parts: PartInput[]): Promise<void> {
  const db = getDb()
  const v = await db.query.stockVersion.findFirst({
    where: (v, { eq }) => eq(v.id, versionId),
    columns: { id: true, status: true },
  })
  if (!v)
    throw new AppError(404, 'not_found', 'version not found')
  if (v.status !== 'draft')
    throw new AppError(409, 'not_draft', 'parts are frozen on published versions')

  for (const p of parts) {
    if (p.role === 'resourcepack') {
      if (!p.blobSha256)
        throw new AppError(400, 'bad_part', 'resourcepack parts require blobSha256')
    }
    else {
      if (typeof p.textContent !== 'string' || p.textContent.length === 0)
        throw new AppError(400, 'bad_part', `${p.role} parts require textContent`)
    }
  }
  const groupCounts = new Map<string, number>()
  for (const p of parts) {
    if (p.group)
      groupCounts.set(p.group, (groupCounts.get(p.group) ?? 0) + 1)
  }
  for (const [g, n] of groupCounts) {
    if (n < 2)
      throw new AppError(400, 'bad_group', `group '${g}' must have at least 2 parts`)
  }

  await db.transaction(async (tx) => {
    await tx.delete(schema.stockPart).where(eq(schema.stockPart.versionId, versionId))
    if (parts.length === 0)
      return
    await tx.insert(schema.stockPart).values(parts.map((p, i) => ({
      id: newResourceId(),
      versionId,
      order: i,
      role: p.role,
      name: p.name,
      description: p.description ?? null,
      group: p.group ?? null,
      textContent: p.textContent ?? null,
      blobSha256: p.blobSha256 ?? null,
      blobFilename: p.blobFilename ?? null,
    })))
  })
}

export async function publishVersion(versionId: string): Promise<void> {
  const db = getDb()
  const result = await db.transaction(async (tx) => {
    const v = await tx.query.stockVersion.findFirst({
      where: (vv, { eq }) => eq(vv.id, versionId),
      with: { parts: { columns: { blobSha256: true } } },
    })
    if (!v)
      throw new AppError(404, 'not_found', 'version not found')
    if (v.status !== 'draft')
      throw new AppError(409, 'already_published', 'version already published')

    await tx.update(schema.stockVersion)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(schema.stockVersion.id, versionId))

    const distinctShas = new Set(v.parts.map(p => p.blobSha256).filter((s): s is string => !!s))
    for (const sha of distinctShas) {
      await tx.update(schema.stockBlob)
        .set({ refCount: sql`${schema.stockBlob.refCount} + 1` })
        .where(eq(schema.stockBlob.sha256, sha))
    }

    await tx.update(schema.stockCreation)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.stockCreation.id, v.creationId))

    return { creationId: v.creationId, versionNumber: v.number }
  })

  void (async () => {
    const creation = await getDb().query.stockCreation.findFirst({
      where: (c, { eq }) => eq(c.id, result.creationId),
      columns: { id: true, discordThreadId: true },
    })
    if (!creation)
      return
    if (!creation.discordThreadId)
      await createCreationThread(creation.id)
    else
      await postVersionReply(creation.id, result.versionNumber)
  })()
}

export async function softDeleteCreation(creationId: string, actorUserId: string): Promise<void> {
  const db = getDb()
  await db.transaction(async (tx) => {
    const c = await tx.query.stockCreation.findFirst({
      where: (cc, { eq }) => eq(cc.id, creationId),
      with: {
        versions: {
          where: (v, { eq }) => eq(v.status, 'published'),
          with: { parts: { columns: { blobSha256: true } } },
        },
        media: { columns: { blobSha256: true } },
      },
    })
    if (!c)
      throw new AppError(404, 'not_found', 'creation not found')

    const actor = await tx.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, actorUserId),
      columns: { isAdmin: true },
    })
    if (c.authorUserId !== actorUserId && !actor?.isAdmin)
      throw new AppError(403, 'forbidden', 'not allowed')

    const distinct = new Set<string>()
    for (const v of c.versions) {
      for (const p of v.parts) {
        if (p.blobSha256)
          distinct.add(p.blobSha256)
      }
    }
    for (const m of c.media) {
      if (m.blobSha256)
        distinct.add(m.blobSha256)
    }
    for (const sha of distinct) {
      await tx.update(schema.stockBlob)
        .set({ refCount: sql`greatest(${schema.stockBlob.refCount} - 1, 0)` })
        .where(eq(schema.stockBlob.sha256, sha))
    }

    await tx.update(schema.stockCreation)
      .set({ deletedAt: new Date() })
      .where(eq(schema.stockCreation.id, creationId))
  })
}
