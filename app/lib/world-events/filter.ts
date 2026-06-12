import type { JoinedWorldEvent, WorldEventFilter } from './types'

export function defaultFilter(): WorldEventFilter {
  return {
    search: '',
    regions: [],
    difficulties: [],
    lengths: [],
    levelMin: 1,
    levelMax: 110,
    dropsIngredient: null,
    dropsExclusiveItem: null,
    hasSchedule: false,
  }
}

export function filterWorldEvents(
  events: ReadonlyArray<JoinedWorldEvent>,
  f: WorldEventFilter,
): JoinedWorldEvent[] {
  const search = f.search.trim().toLowerCase()
  return events.filter((j) => {
    const e = j.event
    if (search && !e.name.toLowerCase().includes(search))
      return false
    if (f.regions.length && (!j.loot || !f.regions.includes(j.loot.region)))
      return false
    if (f.difficulties.length && !f.difficulties.includes(e.difficulty))
      return false
    if (f.lengths.length && !f.lengths.includes(e.length))
      return false
    if (e.level < f.levelMin || e.level > f.levelMax)
      return false
    if (f.hasSchedule && e.schedule == null)
      return false
    if (f.dropsIngredient) {
      const d = j.loot?.drops
      if (!d)
        return false
      const hit = d.commonIngredients.includes(f.dropsIngredient)
        || d.possibleIngredients.includes(f.dropsIngredient)
        || d.exclusiveIngredients.includes(f.dropsIngredient)
      if (!hit)
        return false
    }
    if (f.dropsExclusiveItem) {
      const d = j.loot?.drops
      if (!d)
        return false
      const hit = d.exclusiveItems.includes(f.dropsExclusiveItem)
        || d.rareRandomLoots.some(r => r.name === f.dropsExclusiveItem)
      if (!hit)
        return false
    }
    return true
  })
}
