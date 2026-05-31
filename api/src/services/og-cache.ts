import type { Buffer } from 'node:buffer'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '../db/client'

export async function getOgCache(key: string): Promise<{ data: Buffer, contentType: string } | null> {
  const [row] = await getDb()
    .select()
    .from(schema.ogImageCache)
    .where(eq(schema.ogImageCache.key, key))
    .limit(1)
  if (!row)
    return null
  return { data: row.data, contentType: row.contentType }
}

export async function setOgCache(key: string, data: Buffer, contentType: string): Promise<void> {
  await getDb()
    .insert(schema.ogImageCache)
    .values({ key, data, contentType })
    .onConflictDoUpdate({
      target: schema.ogImageCache.key,
      set: { data, contentType, createdAt: new Date() },
    })
}
