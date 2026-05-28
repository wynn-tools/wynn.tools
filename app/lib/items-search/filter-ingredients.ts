import type { IngredientCriteria, SearchIngredient } from './types'
import { isInverted } from '~/lib/data/identifications'

function matches(ing: SearchIngredient, c: IngredientCriteria): boolean {
  if (c.name && !ing.displayName.toLowerCase().includes(c.name.toLowerCase()))
    return false
  if (c.tiers.length && !c.tiers.includes(ing.tier))
    return false
  if (ing.level < c.levelRange[0] || ing.level > c.levelRange[1])
    return false
  if (c.skills.length && !c.skills.every(s => ing.skills.includes(s)))
    return false
  for (const f of c.identifications) {
    const has = ing.identifications[f.key] !== undefined
    if (f.exclude ? has : !has)
      return false
  }
  return true
}

function rawValue(ing: SearchIngredient, key: string): number {
  const entry = ing.identifications[key]
  return entry ? entry.raw : Number.NEGATIVE_INFINITY
}

export function filterIngredients(list: SearchIngredient[], c: IngredientCriteria): SearchIngredient[] {
  const result = list.filter(i => matches(i, c))
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
