import type { WorldEventLootMap } from './types'
import { slugify } from './slug'

export interface WorldEventItemDrop {
  event: string
  slug: string
  region: string
  source: 'exclusiveItems' | 'rareRandomLoots'
  note?: string | null
}

export function worldEventDropsForItem(itemName: string, loot: WorldEventLootMap): WorldEventItemDrop[] {
  const out: WorldEventItemDrop[] = []
  for (const [event, entry] of Object.entries(loot)) {
    if (entry.drops.exclusiveItems.includes(itemName)) {
      out.push({ event, slug: slugify(event), region: entry.region, source: 'exclusiveItems' })
      continue
    }
    const rare = entry.drops.rareRandomLoots.find(d => d.name === itemName)
    if (rare)
      out.push({ event, slug: slugify(event), region: entry.region, source: 'rareRandomLoots', note: rare.note })
  }
  return out
}
