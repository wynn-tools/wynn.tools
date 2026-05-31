import process from 'node:process'
import { like } from 'drizzle-orm'
import { createCdnClient } from '~/lib/data/cdn-client'
import { slugify } from '~/lib/items-search/slug'
import { getDb, schema } from '../db/client'
import { env } from '../env'
import { setOgCache } from '../services/og-cache'
import { createOgFetcher } from '../services/og-fetcher'

const BATCH = 5

interface VersionEntry {
  gameVersion: string
  contentHash: string
}

interface CdnItem {
  displayName: string
}

async function main() {
  const force = process.argv.includes('--force')
  const e = env()
  const fetcher = createOgFetcher(e.NUXT_URL)
  const cdn = createCdnClient(e.CDN_BASE_URL)

  const versions = await cdn.fetchJson<VersionEntry[]>('versions.json')
  const latest = versions.at(-1)
  if (!latest)
    throw new Error('versions.json is empty')
  const { gameVersion } = latest

  const items = await cdn.fetchJson<CdnItem[]>(`data/${gameVersion}/items.json`)
  console.log(`Warming ${items.length} items (game version ${gameVersion})${force ? ' [--force]' : ''}`)

  const cachedKeys = force
    ? new Set<string>()
    : new Set(
        (await getDb()
          .select({ key: schema.ogImageCache.key })
          .from(schema.ogImageCache)
          .where(like(schema.ogImageCache.key, 'item:%'))
        ).map(r => r.key),
      )

  let succeeded = 0
  let failed = 0
  let skipped = 0

  async function processItem(item: CdnItem, index: number) {
    const slug = slugify(item.displayName)
    const key = `item:${slug}`
    if (cachedKeys.has(key)) {
      skipped++
      return
    }
    try {
      const { data, contentType } = await fetcher.fetchOgImage(`/items/${slug}`)
      await setOgCache(key, data, contentType)
      succeeded++
      console.log(`[${index + 1}/${items.length}] ${slug}`)
    }
    catch (err) {
      failed++
      console.error(`[${index + 1}/${items.length}] FAILED ${slug}: ${(err as Error).message}`)
    }
  }

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    await Promise.all(batch.map((item, j) => processItem(item, i + j)))
  }

  console.log(`\nDone: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped (${items.length} total)`)

  if (items.length > 0 && failed / items.length > 0.1) {
    console.error(`Error: failure rate ${((failed / items.length) * 100).toFixed(1)}% exceeds 10% threshold`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
