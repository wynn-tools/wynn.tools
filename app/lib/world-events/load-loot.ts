import type { DropEntryWithNote, WorldEventLootMap } from './types'
import type { CdnClient } from '~/lib/data/cdn-client'

export async function loadWorldEventLoot(client: CdnClient): Promise<WorldEventLootMap> {
  const raw = await client.fetchJson<Record<string, unknown>>('world-event-loot.json')
  const out: WorldEventLootMap = {}
  for (const [name, entry] of Object.entries(raw)) {
    const e = (entry ?? {}) as Record<string, unknown>
    const drops = (e.drops ?? {}) as Record<string, unknown>
    out[name] = {
      region: String(e.region ?? ''),
      countdown: String(e.countdown ?? ''),
      delay: String(e.delay ?? ''),
      drops: {
        commonIngredients: Array.isArray(drops.commonIngredients) ? drops.commonIngredients as string[] : [],
        possibleIngredients: Array.isArray(drops.possibleIngredients) ? drops.possibleIngredients as string[] : [],
        exclusiveIngredients: Array.isArray(drops.exclusiveIngredients) ? drops.exclusiveIngredients as string[] : [],
        exclusiveItems: Array.isArray(drops.exclusiveItems) ? drops.exclusiveItems as string[] : [],
        rareMobDrops: Array.isArray(drops.rareMobDrops) ? drops.rareMobDrops as string[] : [],
        rareRandomLoots: Array.isArray(drops.rareRandomLoots)
          ? drops.rareRandomLoots as DropEntryWithNote[]
          : [],
      },
    }
  }
  return out
}
