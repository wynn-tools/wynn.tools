import type { WynndleMode } from '~/lib/wynndle/types'

// Keeps the raw `icon` field on each pool entry so the combobox dropdown can
// resolve a sprite URL via lib/items/icon.ts. The Wynndle round payload still
// returns just { id, name, rarity } — the icon lookup happens only on the
// pool side, where the full items.json shape is available.
interface Item { id: string, name: string, rarity: string, icon?: unknown }
const cache = new Map<string, Item[]>()

const RARITY_MAP: Record<string, string> = {
  common: 'Common',
  unique: 'Unique',
  rare: 'Rare',
  legendary: 'Legendary',
  fabled: 'Fabled',
  mythic: 'Mythic',
  set: 'Set',
}

export function useWynndlePool() {
  async function load(mode: WynndleMode, gameVersion: string): Promise<Item[]> {
    const key = `${mode}:${gameVersion}`
    if (cache.has(key))
      return cache.get(key)!
    const base = useRuntimeConfig().public.cdnBaseUrl as string
    const res = await fetch(new URL(`data/${gameVersion}/items.json`, base).toString())
    const raw = await res.json() as { items?: any[] }
    const items = Array.isArray(raw.items) ? raw.items : []
    const out: Item[] = []
    const wantType = mode === 'weapon' ? 'weapon' : 'armour'
    for (const item of items) {
      if (item?.type !== wantType)
        continue
      const rarity = RARITY_MAP[String(item.tier ?? '').toLowerCase()]
      if (!rarity || rarity === 'Common')
        continue
      const id = typeof item.id === 'number' ? String(item.id) : item.name
      const name = item.name || item.displayName
      if (!id || !name)
        continue
      out.push({ id, name, rarity, icon: item.icon })
    }
    out.sort((a, b) => a.name.localeCompare(b.name))
    cache.set(key, out)
    return out
  }
  return { load }
}
