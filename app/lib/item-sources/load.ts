import type { ItemSourcesFile, MerchantTrade, SourceEntry, SourceType } from './types'
import type { CdnClient } from '~/lib/data/cdn-client'

const KNOWN_TYPES = new Set<SourceType>([
  'specificMobDrop',
  'normalMobDrop',
  'miniboss',
  'merchant',
  'dungeonMerchant',
  'quest',
  'worldEvent',
  'raid',
  'dungeon',
  'mobDropRegion',
  'caveCompletion',
  'tinkering',
  'forgeryChest',
  'lootChest',
  'gathering',
  'discovery',
  'environment',
  'event',
  'interaction',
  'unavailable',
])

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function parseTrades(v: unknown): MerchantTrade[] | undefined {
  if (!Array.isArray(v))
    return undefined
  const out: MerchantTrade[] = []
  for (const t of v) {
    if (!t || typeof t !== 'object')
      continue
    const rec = t as Record<string, unknown>
    const merchant = str(rec.merchant)
    if (!merchant)
      continue
    const inputsRaw = Array.isArray(rec.inputs) ? rec.inputs : []
    const inputs = inputsRaw.flatMap((i) => {
      if (!i || typeof i !== 'object')
        return []
      const r = i as Record<string, unknown>
      const item = str(r.item)
      const amount = num(r.amount) ?? 0
      return item ? [{ item, amount }] : []
    })
    out.push({ merchant, inputs })
  }
  return out.length > 0 ? out : undefined
}

const STRING_FIELDS = ['name', 'wiki', 'location', 'npc', 'province', 'length', 'difficulty', 'experience', 'emeralds'] as const
const NUMBER_FIELDS = ['level', 'health', 'combatLevel'] as const

function parseEntry(raw: unknown): SourceEntry | null {
  if (!raw || typeof raw !== 'object')
    return null
  const r = raw as Record<string, unknown>
  const type = r.type as SourceType
  if (!KNOWN_TYPES.has(type))
    return null
  const entry: SourceEntry = { type }
  for (const k of STRING_FIELDS) {
    const v = str(r[k])
    if (v)
      (entry as Record<string, unknown>)[k] = v
  }
  for (const k of NUMBER_FIELDS) {
    const v = num(r[k])
    if (v !== undefined)
      (entry as Record<string, unknown>)[k] = v
  }
  const trades = parseTrades(r.trades)
  if (trades)
    entry.trades = trades
  return entry
}

export async function loadItemSources(client: CdnClient): Promise<ItemSourcesFile> {
  const raw = await client.fetchJson<Record<string, unknown>>('item-sources.json')
  const itemsRaw = (raw.items ?? {}) as Record<string, unknown>
  const items: Record<string, SourceEntry[]> = {}
  for (const [name, value] of Object.entries(itemsRaw)) {
    if (!Array.isArray(value))
      continue
    const entries = value.map(parseEntry).filter((e): e is SourceEntry => e !== null)
    if (entries.length > 0)
      items[name] = entries
  }
  return { items }
}
