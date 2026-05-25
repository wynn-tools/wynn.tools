import type { Item, ItemSet, RawItem, RawItemData } from '../types/item'
import { adaptItem } from './item-adapter'
import { NONE_ITEMS } from './item-constants'

export interface ItemDb {
  items: Item[]
  byName: Map<string, Item>
  byId: Map<number, Item>
  sets: Map<string, ItemSet>
  /** Resolve an id to its final item, following remapID redirects. */
  resolveId: (id: number) => Item | undefined
}

export function buildItemDb(data: RawItemData): ItemDb {
  const byName = new Map<string, Item>()
  const byId = new Map<number, Item>()
  // id -> remapID, for items that redirect to another item.
  const redirects = new Map<number, number>()

  const items: Item[] = []

  for (const raw of data.items as RawItem[]) {
    if (raw.remapID !== undefined && raw.id !== undefined) {
      redirects.set(raw.id, raw.remapID)
      continue
    }
    const item = adaptItem(raw)
    items.push(item)
    byName.set(item.displayName, item)
    byId.set(item.id, item)
  }

  for (const noneItem of NONE_ITEMS) {
    items.push(noneItem)
    byId.set(noneItem.id, noneItem)
  }

  const sets = new Map<string, ItemSet>()
  for (const [setName, setData] of Object.entries(data.sets ?? {})) {
    sets.set(setName, setData)
    for (const itemName of setData.items) {
      const member = byName.get(itemName)
      if (member)
        member.set = setName
    }
  }

  function resolveId(id: number): Item | undefined {
    let current = id
    const seen = new Set<number>()
    while (redirects.has(current)) {
      if (seen.has(current))
        return undefined // cycle guard
      seen.add(current)
      current = redirects.get(current)!
    }
    return byId.get(current)
  }

  return { items, byName, byId, sets, resolveId }
}
