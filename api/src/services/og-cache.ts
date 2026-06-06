import type { Buffer } from 'node:buffer'
import { eq, notLike } from 'drizzle-orm'
import { getDb, schema } from '../db/client'

/**
 * Bump this when the OG renderer output changes (template tweaks, new fields,
 * font/style updates). All cached images are silently regenerated on next read.
 * Orphaned rows from previous versions can be swept with sweepOldOgCache().
 */
export const OG_CACHE_VERSION = 2

function versioned(key: string): string {
  return `v${OG_CACHE_VERSION}:${key}`
}

export async function getOgCache(key: string): Promise<{ data: Buffer, contentType: string } | null> {
  const [row] = await getDb()
    .select()
    .from(schema.ogImageCache)
    .where(eq(schema.ogImageCache.key, versioned(key)))
    .limit(1)
  if (!row)
    return null
  return { data: row.data, contentType: row.contentType }
}

export async function setOgCache(key: string, data: Buffer, contentType: string): Promise<void> {
  await getDb()
    .insert(schema.ogImageCache)
    .values({ key: versioned(key), data, contentType })
    .onConflictDoUpdate({
      target: schema.ogImageCache.key,
      set: { data, contentType, createdAt: new Date() },
    })
}

/** Delete cache rows from any version other than the current one. */
export async function sweepOldOgCache(): Promise<number> {
  const result = await getDb()
    .delete(schema.ogImageCache)
    .where(notLike(schema.ogImageCache.key, `v${OG_CACHE_VERSION}:%`))
    .returning({ key: schema.ogImageCache.key })
  return result.length
}
