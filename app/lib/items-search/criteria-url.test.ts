import { describe, expect, it } from 'vitest'
import {
  defaultIngredientCriteria,
  defaultItemCriteria,
  ingredientCriteriaToQuery,
  itemCriteriaToQuery,
  queryToIngredientCriteria,
  queryToItemCriteria,
} from './criteria-url'

describe('criteria url', () => {
  it('round-trips a populated item criteria', () => {
    const c = {
      ...defaultItemCriteria(),
      name: 'idol',
      types: ['bow', 'wand'],
      tiers: ['Legendary'],
      levelRange: [10, 90] as [number, number],
      restrictions: ['untradable'],
      identifications: [{ key: 'spellDamage', exclude: false }, { key: 'manaRegen', exclude: false }, { key: 'thorns', exclude: true }],
      idSorts: [{ key: 'spellDamage', dir: 'desc' as const }, { key: 'manaRegen', dir: 'asc' as const }],
    }
    expect(queryToItemCriteria(itemCriteriaToQuery(c))).toEqual(c)
  })

  it('empty criteria → empty query', () => {
    expect(itemCriteriaToQuery(defaultItemCriteria())).toEqual({})
  })

  it('malformed query falls back to defaults', () => {
    expect(queryToItemCriteria({ lvl: 'garbage' }).levelRange).toEqual([1, 110])
  })

  it('round-trips a populated ingredient criteria', () => {
    const c = {
      ...defaultIngredientCriteria(),
      name: 'apple',
      tiers: [1, 3],
      levelRange: [5, 80] as [number, number],
      skills: ['Cooking', 'Scribing'],
      identifications: [{ key: 'health', exclude: false }, { key: 'mana', exclude: true }],
      idSorts: [{ key: 'health', dir: 'asc' as const }],
    }
    expect(queryToIngredientCriteria(ingredientCriteriaToQuery(c))).toEqual(c)
  })

  it('empty ingredient criteria → empty query', () => {
    expect(ingredientCriteriaToQuery(defaultIngredientCriteria())).toEqual({})
  })

  it('sort order is preserved (sort priority = order in id list)', () => {
    const c = {
      ...defaultItemCriteria(),
      identifications: [{ key: 'a', exclude: false }, { key: 'b', exclude: false }, { key: 'c', exclude: false }],
      idSorts: [{ key: 'b', dir: 'desc' as const }, { key: 'a', dir: 'asc' as const }],
    }
    const result = queryToItemCriteria(itemCriteriaToQuery(c))
    expect(result.idSorts).toEqual([{ key: 'a', dir: 'asc' }, { key: 'b', dir: 'desc' }])
  })
})
