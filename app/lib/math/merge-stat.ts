import type { Item } from '../types/item'

export type StatValue = number | Map<string, StatValue>
export type StatMap = Map<string, StatValue>

const NONSTACKING_STATS = ['Potion', 'Vulnerability', 'Mask']
const MULT_KEYS = ['damMult', 'defMult', 'healMult']

/** Merge a stat into a stat map. Port of build_utils.js merge_stat. */
export function mergeStat(stats: StatMap, name: string, value: StatValue): void {
  const start = name.split('.', 2)[0]!
  if (MULT_KEYS.includes(start)) {
    if (!stats.has(start))
      stats.set(start, new Map())
    const map = stats.get(start) as StatMap
    if (value instanceof Map) {
      for (const [k, v] of value.entries())
        mergeStat(map, k, v)
      return
    }
    const end = name.split('.', 2)[1]
    if (end !== undefined && NONSTACKING_STATS.includes(end)) {
      const highest = map.get(end)
      if (highest !== undefined) {
        if (typeof highest === 'number' && value > highest)
          map.set(end, value)
        return
      }
    }
    mergeStat(map, name.slice(name.indexOf('.') + 1), value)
    return
  }
  if (stats.has(name))
    stats.set(name, (stats.get(name) as number) + (value as number))
  else
    stats.set(name, value)
}

/** Aggregate the numeric stats of a list of items into one stat map. */
export function aggregateItemStats(items: Item[]): StatMap {
  const stats: StatMap = new Map()
  for (const item of items) {
    for (const [key, value] of Object.entries(item.stats)) {
      if (typeof value === 'number')
        mergeStat(stats, key, value)
    }
  }
  return stats
}
