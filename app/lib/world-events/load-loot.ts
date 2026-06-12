import type { DropEntryWithNote, RareMobDrop, RareMobEntry, WorldEventLootMap } from './types'
import type { CdnClient } from '~/lib/data/cdn-client'

const LEGACY_RARE_MOB = /^(\d+)\s*[×x]\s+(\S.*)$/

function parseRareMobDrop(raw: unknown): RareMobDrop | null {
  if (!raw || typeof raw !== 'object' || !('name' in raw))
    return null
  const o = raw as { name: unknown, tier?: unknown, note?: unknown }
  const name = String(o.name ?? '')
  if (!name)
    return null
  const drop: RareMobDrop = { name }
  if (typeof o.tier === 'number')
    drop.tier = o.tier
  if (typeof o.note === 'string' && o.note)
    drop.note = o.note
  return drop
}

function normalizeRareMobDrops(raw: unknown): RareMobEntry[] {
  if (!Array.isArray(raw))
    return []
  const out: RareMobEntry[] = []
  for (const e of raw) {
    if (typeof e === 'string') {
      const m = e.match(LEGACY_RARE_MOB)
      out.push(m
        ? { name: m[2].trim(), count: Number(m[1]), drops: [] }
        : { name: e, count: 1, drops: [] })
      continue
    }
    if (e && typeof e === 'object' && 'name' in e) {
      const o = e as { name: unknown, count?: unknown, drops?: unknown }
      const name = String(o.name ?? '')
      if (!name)
        continue
      const count = typeof o.count === 'number' && o.count > 0 ? o.count : 1
      const drops = Array.isArray(o.drops)
        ? o.drops.map(parseRareMobDrop).filter((d): d is RareMobDrop => d !== null)
        : []
      out.push({ name, count, drops })
    }
  }
  return out
}

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
        rareMobDrops: normalizeRareMobDrops(drops.rareMobDrops),
        rareRandomLoots: Array.isArray(drops.rareRandomLoots)
          ? drops.rareRandomLoots as DropEntryWithNote[]
          : [],
      },
    }
  }
  return out
}
