import type { Parsed } from './expression'
import type { RollBasis } from './roll-basis'
import type { IdConstraint, ItemCriteria, SearchItem } from './types'
import { isInverted } from '~/lib/data/identifications'
import { parseExpression } from './expression'
import { playerFavoredValue } from './roll-basis'
import { sumPreset } from './stat-sums'

function matchesScalarFilters(item: SearchItem, c: ItemCriteria): boolean {
  if (c.name && !item.name.toLowerCase().includes(c.name.toLowerCase()))
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
  return true
}

function matchesIdConstraint(item: SearchItem, constraint: IdConstraint, basis: RollBasis): boolean {
  if (constraint.kind === 'id') {
    const has = item.identifications[constraint.key] !== undefined
    if (constraint.exclude)
      return !has
    if (constraint.min === undefined && constraint.max === undefined)
      return has
    if (!has)
      return false
    const v = playerFavoredValue(item.identifications[constraint.key], constraint.key, basis)
    const inv = isInverted(constraint.key)
    if (constraint.min !== undefined) {
      if (inv ? v > constraint.min : v < constraint.min)
        return false
    }
    if (constraint.max !== undefined) {
      if (inv ? v < constraint.max : v > constraint.max)
        return false
    }
    return true
  }
  if (constraint.kind === 'sum') {
    const v = sumPreset(item, constraint.preset, basis)
    if (constraint.min !== undefined && v < constraint.min)
      return false
    if (constraint.max !== undefined && v > constraint.max)
      return false
    return true
  }
  // expr handled separately
  return true
}

function sortKeyValue(item: SearchItem, c: Extract<IdConstraint, { kind: 'id' | 'sum' }>, basis: RollBasis): number {
  if (c.kind === 'id') {
    const entry = item.identifications[c.key]
    if (!entry)
      return Number.NEGATIVE_INFINITY
    return playerFavoredValue(entry, c.key, basis)
  }
  return sumPreset(item, c.preset, basis)
}

export function filterItems(items: SearchItem[], c: ItemCriteria): SearchItem[] {
  const exprFns = c.constraints
    .filter((con): con is Extract<IdConstraint, { kind: 'expr' }> => con.kind === 'expr')
    .map(con => parseExpression(con.source))
    .filter((p): p is Extract<Parsed, { ok: true }> => p.ok)

  const result = items.filter((i) => {
    if (!matchesScalarFilters(i, c))
      return false
    for (const con of c.constraints) {
      if (con.kind === 'expr')
        continue
      if (!matchesIdConstraint(i, con, c.rollBasis))
        return false
    }
    for (const fn of exprFns) {
      if (!fn.eval(i, c.rollBasis))
        return false
    }
    return true
  })

  const sorts = c.constraints.filter(
    (con): con is Extract<IdConstraint, { kind: 'id' | 'sum' }> =>
      (con.kind === 'id' || con.kind === 'sum') && con.sort !== undefined,
  )
  if (sorts.length === 0)
    return result
  return result.sort((a, b) => {
    for (const s of sorts) {
      const av = sortKeyValue(a, s, c.rollBasis)
      const bv = sortKeyValue(b, s, c.rollBasis)
      if (av === bv)
        continue
      const desc = s.sort === 'desc'
      const inv = s.kind === 'id' && isInverted(s.key)
      const cmp = av > bv ? 1 : -1
      return (desc ? -cmp : cmp) * (inv ? -1 : 1)
    }
    return 0
  })
}
