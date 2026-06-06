import type { IdConstraint } from './types'
import { describe, expect, it } from 'vitest'
import {
  defaultIngredientCriteria,
  defaultItemCriteria,
  ingredientCriteriaToQuery,
  itemCriteriaToQuery,
  queryToIngredientCriteria,
  queryToItemCriteria,
} from './criteria-url'

describe('criteria-url — backward compat (regression)', () => {
  it('decodes a pre-change items URL and canonicalises shorthand keys', () => {
    // Old URLs used hppeng shorthand; the codec normalises to the v3 long
    // names the search-path items actually carry.
    const q = { type: 'helmet', tier: 'Unique', id: 'str:desc,dex:excl' }
    const c = queryToItemCriteria(q)
    expect(c.types).toEqual(['helmet'])
    expect(c.tiers).toEqual(['Unique'])
    expect(c.rollBasis).toBe('possible')
    expect(c.constraints).toEqual([
      { kind: 'id', key: 'rawStrength', sort: 'desc' },
      { kind: 'id', key: 'rawDexterity', exclude: true },
    ])
  })
  it('re-encodes a legacy-decoded criteria to a shape that decodes identically', () => {
    const q1 = { id: 'str:desc,dex:excl' }
    const c = queryToItemCriteria(q1)
    const q2 = itemCriteriaToQuery(c)
    expect(queryToItemCriteria(q2).constraints).toEqual(c.constraints)
  })
})

describe('criteria-url — new params round-trip', () => {
  it('value threshold serialises to min= and round-trips', () => {
    const c = defaultItemCriteria()
    c.constraints = [{ kind: 'id', key: 'strengthPoints', min: 10 }]
    const q = itemCriteriaToQuery(c)
    expect(q.min).toBe('strengthPoints:10')
    expect(q.id).toBeUndefined()
    expect(queryToItemCriteria(q).constraints).toEqual(c.constraints)
  })
  it('sort + min on same key produces both id= and min= tokens', () => {
    const c = defaultItemCriteria()
    c.constraints = [{ kind: 'id', key: 'strengthPoints', sort: 'desc', min: 10 }]
    const q = itemCriteriaToQuery(c)
    expect(q.id).toBe('strengthPoints:desc')
    expect(q.min).toBe('strengthPoints:10')
    expect(queryToItemCriteria(q).constraints).toEqual(c.constraints)
  })
  it('stat-sum preset serialises to sum=', () => {
    const c = defaultItemCriteria()
    c.constraints = [{ kind: 'sum', preset: 'spSum', min: 12 }]
    const q = itemCriteriaToQuery(c)
    expect(q.sum).toBe('spSum:12')
    expect(queryToItemCriteria(q).constraints).toEqual(c.constraints)
  })
  it('expression serialises to expr=', () => {
    const c = defaultItemCriteria()
    c.constraints = [{ kind: 'expr', source: 'str + dex >= 10' }]
    const q = itemCriteriaToQuery(c)
    expect(q.expr).toBe('str + dex >= 10')
    expect(queryToItemCriteria(q).constraints).toEqual(c.constraints)
  })
  it('rollBasis=guaranteed serialises to roll=guaranteed', () => {
    const c = defaultItemCriteria()
    c.rollBasis = 'guaranteed'
    const q = itemCriteriaToQuery(c)
    expect(q.roll).toBe('guaranteed')
    expect(queryToItemCriteria(q).rollBasis).toBe('guaranteed')
  })
  it('rollBasis=possible is omitted', () => {
    const q = itemCriteriaToQuery(defaultItemCriteria())
    expect(q.roll).toBeUndefined()
  })
})

describe('criteria-url — basics', () => {
  it('empty criteria → empty query', () => {
    expect(itemCriteriaToQuery(defaultItemCriteria())).toEqual({})
  })

  it('malformed lvl falls back to defaults', () => {
    expect(queryToItemCriteria({ lvl: 'garbage' }).levelRange).toEqual([1, 120])
  })

  it('round-trips a populated item criteria', () => {
    // Use v3 long names — what canonicalKey normalises decoded URLs to and
    // what items carry in their identifications.
    const constraints: IdConstraint[] = [
      { kind: 'id', key: 'spellDamage', sort: 'desc' },
      { kind: 'id', key: 'manaRegen', sort: 'asc' },
      { kind: 'id', key: 'thorns', exclude: true },
    ]
    const c = {
      ...defaultItemCriteria(),
      name: 'idol',
      types: ['bow', 'wand'],
      tiers: ['Legendary'],
      levelRange: [10, 90] as [number, number],
      restrictions: ['untradable'],
      constraints,
    }
    expect(queryToItemCriteria(itemCriteriaToQuery(c))).toEqual(c)
  })

  it('round-trips a populated ingredient criteria', () => {
    const constraints: IdConstraint[] = [
      { kind: 'id', key: 'health', sort: 'asc' },
      { kind: 'id', key: 'mana', exclude: true },
    ]
    const c = {
      ...defaultIngredientCriteria(),
      name: 'apple',
      tiers: [1, 3],
      levelRange: [5, 80] as [number, number],
      skills: ['Cooking', 'Scribing'],
      constraints,
    }
    expect(queryToIngredientCriteria(ingredientCriteriaToQuery(c))).toEqual(c)
  })

  it('empty ingredient criteria → empty query', () => {
    expect(ingredientCriteriaToQuery(defaultIngredientCriteria())).toEqual({})
  })
})

describe('criteria-url — ingredients mirror items', () => {
  it('ingredient threshold round-trips', () => {
    const c = defaultIngredientCriteria()
    c.constraints = [{ kind: 'id', key: 'rawStrength', min: 3 }]
    const q = ingredientCriteriaToQuery(c)
    expect(queryToIngredientCriteria(q).constraints).toEqual(c.constraints)
  })
})
