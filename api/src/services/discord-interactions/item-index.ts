import process from 'node:process'
import { env } from '../../env'

export interface ItemSummary {
  id: number
  name: string
  displayName: string
  rarity: string
  type: string
  tier: string | null
  requirements: Record<string, unknown>
  identifications: Record<string, unknown>
}

export interface ItemIndex {
  suggest: (query: string) => ItemSummary[]
  get: (name: string) => ItemSummary | undefined
}

const MAX_SUGGESTIONS = 25

export function createItemIndex(items: ItemSummary[]): ItemIndex {
  const byName = new Map<string, ItemSummary>()
  for (const item of items) byName.set(item.name.toLowerCase(), item)

  function suggest(query: string): ItemSummary[] {
    const q = query.trim().toLowerCase()
    if (!q)
      return items.slice(0, MAX_SUGGESTIONS)
    const exact: ItemSummary[] = []
    const prefix: ItemSummary[] = []
    const substring: ItemSummary[] = []
    const fuzzy: { item: ItemSummary, d: number }[] = []
    for (const item of items) {
      const name = item.name.toLowerCase()
      if (name === q) {
        exact.push(item)
      }
      else if (name.startsWith(q)) {
        prefix.push(item)
      }
      else if (name.includes(q)) {
        substring.push(item)
      }
      else {
        const d = levenshtein(q, name.slice(0, q.length + 2))
        if (d <= 2)
          fuzzy.push({ item, d })
      }
    }
    fuzzy.sort((a, b) => a.d - b.d)
    return [...exact, ...prefix, ...substring, ...fuzzy.map(f => f.item)].slice(0, MAX_SUGGESTIONS)
  }

  return {
    suggest,
    get: name => byName.get(name.toLowerCase()),
  }
}

function levenshtein(a: string, b: string): number {
  if (a === b)
    return 0
  if (!a.length || !b.length)
    return Math.max(a.length, b.length)
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 0; i < a.length; i++) {
    let curr = i + 1
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      const next = Math.min(curr + 1, prev[j + 1] + 1, prev[j] + cost)
      prev[j] = curr
      curr = next
    }
    prev[b.length] = curr
  }
  return prev[b.length]
}

let cached: ItemIndex | null = null
let refreshTimer: NodeJS.Timeout | null = null

interface CdnVersion { gameVersion: string, hash: string }
interface CdnItemsFile { items: CdnItem[] }
interface CdnItem {
  id?: number
  name?: string
  displayName?: string
  type?: string
  subType?: string
  tier?: string | null
  requirements?: Record<string, unknown>
  identifications?: Record<string, unknown>
}

async function fetchLatestItems(): Promise<ItemSummary[]> {
  const base = env().CDN_BASE_URL.replace(/\/$/, '')
  const versions = await (await fetch(`${base}/versions.json`)).json() as CdnVersion[]
  if (!Array.isArray(versions) || versions.length === 0)
    throw new Error('versions.json is empty or malformed')
  const latest = versions[versions.length - 1].gameVersion
  const itemsFile = await (await fetch(`${base}/data/${latest}/items.json`)).json() as CdnItemsFile
  const list = itemsFile.items ?? []
  return list
    .filter(i => i.name)
    .map(i => ({
      id: i.id ?? 0,
      name: i.name as string,
      displayName: i.displayName ?? (i.name as string),
      // Wynncraft v3 items use `tier` (Legendary/Fabled/...) as the rarity concept.
      rarity: (i.tier ?? 'common').toLowerCase(),
      type: i.type ?? 'unknown',
      tier: i.tier ?? null,
      requirements: i.requirements ?? {},
      identifications: i.identifications ?? {},
    }))
}

export async function initItemIndex(): Promise<void> {
  cached = createItemIndex(await fetchLatestItems())
  refreshTimer = setInterval(async () => {
    try {
      cached = createItemIndex(await fetchLatestItems())
    }
    catch {
      /* keep previous snapshot */
    }
  }, 6 * 60 * 60 * 1000)
}

export function getItemIndex(): ItemIndex {
  if (!cached)
    throw new Error('item index not initialized')
  return cached
}

export function stopItemIndex(): void {
  if (refreshTimer)
    clearInterval(refreshTimer)
  refreshTimer = null
  cached = null
}

export function __setItemIndexForTesting(index: ItemIndex): void {
  if (process.env.NODE_ENV !== 'test')
    throw new Error('test-only')
  cached = index
}
