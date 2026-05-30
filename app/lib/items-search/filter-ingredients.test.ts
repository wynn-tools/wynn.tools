import type { IngredientCriteria, SearchIngredient } from './types'
import { describe, expect, it } from 'vitest'
import { filterIngredients } from './filter-ingredients'

const BASE_MOD = { above: 0, under: 0, left: 0, right: 0, touching: 0, notTouching: 0 }

function base(): IngredientCriteria {
  return { name: '', tiers: [], levelRange: [1, 110], skills: [], mob: '', identifications: [], idSorts: [] }
}

function mk(p: Partial<SearchIngredient>): SearchIngredient {
  return { id: 0, name: 'x', displayName: 'X', tier: 0, level: 50, skills: [], identifications: {}, itemOnlyIDs: {}, consumableOnlyIDs: {}, positionModifiers: BASE_MOD, droppedBy: [], icon: undefined, ...p }
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

describe('filterIngredients mob filter', () => {
  it('returns all when mob is empty', () => {
    const ing = mk({ droppedBy: [{ name: 'Magma Entity', coords: null }] })
    expect(filterIngredients([ing], base())).toHaveLength(1)
  })

  it('matches case-insensitively on mob name', () => {
    const ing = mk({ droppedBy: [{ name: 'Magma Entity', coords: [[100, 64, -200, 30]] }] })
    expect(filterIngredients([ing], { ...base(), mob: 'magma' })).toHaveLength(1)
    expect(filterIngredients([ing], { ...base(), mob: 'MAGMA' })).toHaveLength(1)
  })

  it('excludes when no mob matches', () => {
    const ing = mk({ droppedBy: [{ name: 'Magma Entity', coords: null }] })
    expect(filterIngredients([ing], { ...base(), mob: 'squid' })).toHaveLength(0)
  })

  it('excludes when droppedBy is empty', () => {
    const ing = mk({ droppedBy: [] })
    expect(filterIngredients([ing], { ...base(), mob: 'anything' })).toHaveLength(0)
  })
})
