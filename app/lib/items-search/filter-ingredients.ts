import type { Parsed } from './expression'
import type { RollBasis } from './roll-basis'
import type { IdConstraint, IngredientCriteria, SearchIngredient } from './types'
import { isInverted } from '~/lib/data/identifications'
import { parseExpression } from './expression'
import { playerFavoredValue } from './roll-basis'

function matchesScalar(ing: SearchIngredient, c: IngredientCriteria): boolean {
  if (c.name && !ing.displayName.toLowerCase().includes(c.name.toLowerCase()))
    return false
  if (c.tiers.length && !c.tiers.includes(ing.tier))
    return false
  if (ing.level < c.levelRange[0] || ing.level > c.levelRange[1])
    return false
  if (c.skills.length && !c.skills.every(s => ing.skills.includes(s)))
    return false
  if (c.mob) {
    const lower = c.mob.toLowerCase()
    if (!ing.droppedBy.some(d => d.name.toLowerCase().includes(lower)))
      return false
  }
  return true
}

function matchesIdConstraint(ing: SearchIngredient, c: IdConstraint, basis: RollBasis): boolean {
  if (c.kind === 'id') {
    const has = ing.identifications[c.key] !== undefined
    if (c.exclude)
      return !has
    if (c.min === undefined && c.max === undefined)
      return has
    if (!has)
      return false
    const v = playerFavoredValue(ing.identifications[c.key], c.key, basis)
    const inv = isInverted(c.key)
    if (c.min !== undefined && (inv ? v > c.min : v < c.min))
      return false
    if (c.max !== undefined && (inv ? v < c.max : v > c.max))
      return false
    return true
  }
  // sum-kind: no ingredient presets, accept as no-op
  return true
}

export function filterIngredients(list: SearchIngredient[], c: IngredientCriteria): SearchIngredient[] {
  const exprFns = c.constraints
    .filter((con): con is Extract<IdConstraint, { kind: 'expr' }> => con.kind === 'expr')
    .map(con => parseExpression(con.source))
    .filter((p): p is Extract<Parsed, { ok: true }> => p.ok)

  const result = list.filter((i) => {
    if (!matchesScalar(i, c))
      return false
    for (const con of c.constraints) {
      if (con.kind === 'expr')
        continue
      if (!matchesIdConstraint(i, con, c.rollBasis))
        return false
    }
    for (const fn of exprFns) {
      if (!fn.eval(i as never, c.rollBasis))
        return false
    }
    return true
  })

  const sorts = c.constraints.filter(
    (con): con is Extract<IdConstraint, { kind: 'id' }> => con.kind === 'id' && con.sort !== undefined,
  )
  if (sorts.length === 0)
    return result
  return result.sort((a, b) => {
    for (const s of sorts) {
      const av = a.identifications[s.key] ? playerFavoredValue(a.identifications[s.key], s.key, c.rollBasis) : Number.NEGATIVE_INFINITY
      const bv = b.identifications[s.key] ? playerFavoredValue(b.identifications[s.key], s.key, c.rollBasis) : Number.NEGATIVE_INFINITY
      if (av === bv)
        continue
      const desc = s.sort === 'desc'
      const inv = isInverted(s.key)
      const cmp = av > bv ? 1 : -1
      return (desc ? -cmp : cmp) * (inv ? -1 : 1)
    }
    return 0
  })
}
