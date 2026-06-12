import { eq } from 'drizzle-orm'
import { getDb, schema } from '../db/client'
import { deleteBlob } from './blob-store'

export async function gcOrphanBlobs(
  { olderThanMs = 24 * 3600 * 1000 }: { olderThanMs?: number } = {},
): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - olderThanMs)
  const rows = await getDb().query.stockBlob.findMany({
    where: (b, { and, eq, lt }) => and(eq(b.refCount, 0), lt(b.createdAt, cutoff)),
    columns: { sha256: true },
  })
  let deleted = 0
  for (const r of rows) {
    await deleteBlob(r.sha256).catch(() => {})
    await getDb().delete(schema.stockBlob).where(eq(schema.stockBlob.sha256, r.sha256))
    deleted++
  }
  return { deleted }
}
