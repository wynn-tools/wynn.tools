import type { IngredientCriteria, SearchIngredient } from './types'
import { describe, expect, it } from 'vitest'
import { filterIngredients } from './filter-ingredients'

function base(): IngredientCriteria {
  return { name: '', tiers: [], levelRange: [1, 110], skills: [], identifications: [], idSorts: [] }
}

function mk(p: Partial<SearchIngredient>): SearchIngredient {
  return { id: 0, name: 'x', displayName: 'X', tier: 0, level: 50, skills: [], identifications: {}, itemOnlyIDs: {}, consumableOnlyIDs: {}, ...p }
}

describe('filterIngredients', () => {
  it('filters by tier and required skills (all)', () => {
    const a = mk({ displayName: 'A', tier: 2, skills: ['alchemism', 'cooking'] })
    const b = mk({ displayName: 'B', tier: 1, skills: ['cooking'] })
    expect(filterIngredients([a, b], { ...base(), tiers: [2] })).toEqual([a])
    expect(filterIngredients([a, b], { ...base(), skills: ['alchemism', 'cooking'] })).toEqual([a])
  })

  it('sorts by id raw desc', () => {
    const a = mk({ displayName: 'A', identifications: { poison: { min: 0, max: 0, raw: 100 } } })
    const b = mk({ displayName: 'B', identifications: { poison: { min: 0, max: 0, raw: 200 } } })
    const sorted = filterIngredients([a, b], { ...base(), idSorts: [{ key: 'poison', dir: 'desc' }] })
    expect(sorted.map(i => i.displayName)).toEqual(['B', 'A'])
  })
})
