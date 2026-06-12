import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'
import { newResourceId } from '../lib/ids'
import { createCreationThread } from './stock-discord-bridge'
import { softDeleteCreation } from './stock-write'

async function log(
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  payload?: unknown,
) {
  await getDb().insert(schema.stockAdminAuditLog).values({
    id: newResourceId(),
    actorUserId,
    action,
    targetType,
    targetId,
    payload: (payload ?? null) as never,
  })
}

export async function adminSoftDeleteBySlug(actorId: string, slug: string): Promise<void> {
  const c = await getDb().query.stockCreation.findFirst({
    where: (cc, { eq }) => eq(cc.slug, slug),
    columns: { id: true },
  })
  if (!c)
    throw new AppError(404, 'not_found', 'creation not found')
  await softDeleteCreation(c.id, actorId)
  await log(actorId, 'soft-delete', 'creation', c.id)
}

export async function adminRestoreBySlug(actorId: string, slug: string): Promise<void> {
  const db = getDb()
  const c = await db.query.stockCreation.findFirst({
    where: (cc, { eq }) => eq(cc.slug, slug),
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
  await db.transaction(async (tx) => {
    await tx.update(schema.stockCreation)
      .set({ deletedAt: null })
      .where(eq(schema.stockCreation.id, c.id))
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
        .set({ refCount: sql`${schema.stockBlob.refCount} + 1` })
        .where(eq(schema.stockBlob.sha256, sha))
    }
  })
  await log(actorId, 'restore', 'creation', c.id)
}

export async function adminBanUser(actorId: string, targetUserId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.update(schema.users)
      .set({ bannedAt: new Date() })
      .where(eq(schema.users.id, targetUserId))
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, targetUserId))
  })
  await log(actorId, 'ban-user', 'user', targetUserId)
}

export async function adminRebridge(actorId: string, slug: string): Promise<void> {
  const c = await getDb().query.stockCreation.findFirst({
    where: (cc, { eq }) => eq(cc.slug, slug),
    columns: { id: true },
  })
  if (!c)
    throw new AppError(404, 'not_found', 'creation not found')
  const id = await createCreationThread(c.id)
  await log(actorId, 'rebridge', 'creation', c.id, { resultThreadId: id })
}
