import type { JoinedWorldEvent, RareMobEntry, ResolvedDrop, ResolvedDrops, ResolvedRareMob, ResolvedRareMobDrop, WorldEventDrops, WorldEventLootMap } from './types'
import type { SearchIngredient, SearchItem } from '~/lib/items-search/types'
import type { WorldEvent } from '~/types/map'
import { slugify } from './slug'

function resolveOne(
  name: string,
  ingredients: ReadonlyMap<string, SearchIngredient>,
  items: ReadonlyMap<string, SearchItem>,
): ResolvedDrop {
  const ing = ingredients.get(name)
  if (ing)
    return { name, ingredient: ing }
  const item = items.get(name)
  if (item)
    return { name, item }
  return { name }
}

function resolveList(
  names: string[],
  ingredients: ReadonlyMap<string, SearchIngredient>,
  items: ReadonlyMap<string, SearchItem>,
): ResolvedDrop[] {
  return names.map(n => resolveOne(n, ingredients, items))
}

function resolveRareMobs(
  mobs: RareMobEntry[],
  ingredients: ReadonlyMap<string, SearchIngredient>,
  items: ReadonlyMap<string, SearchItem>,
): ResolvedRareMob[] {
  return mobs.map((m): ResolvedRareMob => ({
    name: m.name,
    count: m.count,
    drops: m.drops.map((d): ResolvedRareMobDrop => {
      const base = resolveOne(d.name, ingredients, items)
      const out: ResolvedRareMobDrop = { ...base, note: d.note ?? null }
      if (typeof d.tier === 'number')
        out.tier = d.tier
      return out
    }),
  }))
}

function resolveDrops(
  drops: WorldEventDrops,
  ingredients: ReadonlyMap<string, SearchIngredient>,
  items: ReadonlyMap<string, SearchItem>,
): ResolvedDrops {
  return {
    commonIngredients: resolveList(drops.commonIngredients, ingredients, items),
    possibleIngredients: resolveList(drops.possibleIngredients, ingredients, items),
    exclusiveIngredients: resolveList(drops.exclusiveIngredients, ingredients, items),
    exclusiveItems: resolveList(drops.exclusiveItems, ingredients, items),
    rareMobs: resolveRareMobs(drops.rareMobDrops, ingredients, items),
    rareRandomLoots: drops.rareRandomLoots.map((entry): ResolvedDrop => {
      const base = resolveOne(entry.name, ingredients, items)
      return { ...base, note: entry.note }
    }),
  }
}

export function joinWorldEvents(
  events: ReadonlyArray<WorldEvent>,
  loot: WorldEventLootMap,
  ingredients: ReadonlyMap<string, SearchIngredient>,
  items: ReadonlyMap<string, SearchItem>,
  onOrphanLoot: (name: string) => void = () => {},
): JoinedWorldEvent[] {
  const apiNames = new Set(events.map(e => e.name))
  for (const name of Object.keys(loot)) {
    if (!apiNames.has(name))
      onOrphanLoot(name)
  }
  return events.map((event) => {
    const l = loot[event.name] ?? null
    return {
      event,
      slug: slugify(event.name),
      loot: l,
      resolved: l ? resolveDrops(l.drops, ingredients, items) : null,
    }
  })
}
