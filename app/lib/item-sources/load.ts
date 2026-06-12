import type { ItemSourcesFile, MobSource } from './types'
import type { CdnClient } from '~/lib/data/cdn-client'

export async function loadItemSources(client: CdnClient): Promise<ItemSourcesFile> {
  const raw = await client.fetchJson<Record<string, unknown>>('item-sources.json')
  const mobsRaw = (raw.mobs ?? {}) as Record<string, unknown>
  const mobs: Record<string, MobSource> = {}
  for (const [name, entry] of Object.entries(mobsRaw)) {
    const e = (entry ?? {}) as Record<string, unknown>
    const drops = (e.drops ?? {}) as Record<string, unknown>
    mobs[name] = {
      wiki: String(e.wiki ?? ''),
      drops: {
        guaranteed: Array.isArray(drops.guaranteed) ? drops.guaranteed as string[] : [],
        exclusive: Array.isArray(drops.exclusive) ? drops.exclusive as string[] : [],
      },
    }
  }
  return { mobs }
}
