import type { JoinedWorldEvent, ResolvedDrop, ResolvedDrops, WorldEventDrops, WorldEventLootMap } from './types'
import type { SearchIngredient, SearchItem } from '~/lib/items-search/types'
import type { WorldEvent } from '~/types/map'
import { slugify } from './slug'

function resolveList(
  names: string[],
  ingredients: ReadonlyMap<string, SearchIngredient>,
  items: ReadonlyMap<string, SearchItem>,
): ResolvedDrop[] {
  return names.map((name): ResolvedDrop => {
    const ing = ingredients.get(name)
    if (ing)
      return { name, ingredient: ing }
    const item = items.get(name)
    if (item)
      return { name, item }
    return { name }
  })
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
    rareMobDrops: resolveList(drops.rareMobDrops, ingredients, items),
    rareRandomLoots: drops.rareRandomLoots.map((entry): ResolvedDrop => {
      const base = resolveList([entry.name], ingredients, items)[0]
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
