import type { ItemCriteria, SearchItem } from './types'
import { isInverted } from '~/lib/data/identifications'

function matches(item: SearchItem, c: ItemCriteria): boolean {
  if (c.name && !item.displayName.toLowerCase().includes(c.name.toLowerCase()))
    return false
  if (c.types.length && !c.types.includes(item.subType))
    return false
  if (c.tiers.length && !c.tiers.includes(item.tier))
    return false
  if (c.sets.length && !item.sets.some(s => c.sets.includes(s)))
    return false
  if (item.level < c.levelRange[0] || item.level > c.levelRange[1])
    return false
  if (c.restrictions.includes('untradable') && item.restriction !== 'untradable')
    return false
  if (c.restrictions.includes('quest') && item.requirements?.quest == null)
    return false
  if (c.majorId && !item.majorIds.some(m => m.name === c.majorId))
    return false
  for (const f of c.identifications) {
    const has = item.identifications[f.key] !== undefined
    if (f.exclude ? has : !has)
      return false
  }
  return true
}

function rawValue(item: SearchItem, key: string): number {
  const entry = item.identifications[key]
  return entry ? entry.raw : Number.NEGATIVE_INFINITY
}

export function filterItems(items: SearchItem[], c: ItemCriteria): SearchItem[] {
  const result = items.filter(i => matches(i, c))
  if (c.idSorts.length === 0)
    return result
  return result.sort((a, b) => {
    for (const sort of c.idSorts) {
      const av = rawValue(a, sort.key)
      const bv = rawValue(b, sort.key)
      if (av === bv)
        continue
      const desc = sort.dir === 'desc'
      const flip = isInverted(sort.key)
      const cmp = av > bv ? 1 : -1
      return (desc ? -cmp : cmp) * (flip ? -1 : 1)
    }
    return 0
  })
}
