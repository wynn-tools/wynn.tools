import type { IdConstraint, ItemCriteria, SearchItem } from './types'
import { describe, expect, it } from 'vitest'
import { filterItems } from './filter-items'

function mk(p: Partial<SearchItem>): SearchItem {
  return {
    id: 0,
    name: 'x',
    displayName: 'X',
    type: 'weapon',
    subType: 'wand',
    tier: 'Unique',
    level: 50,
    requirements: { level: 50, classRequirement: null, strength: 0, dexterity: 0, intelligence: 0, defence: 0, agility: 0 } as never,
    powderSlots: 0,
    restriction: null,
    dropRestriction: 'normal',
    attackSpeed: null,
    majorIds: [],
    base: {},
    identifications: {},
    lore: null,
    set: null,
    sets: [],
    emblem: null,
    averageDps: null,
    elements: [],
    ...p,
  } as SearchItem
}

const baseCriteria: ItemCriteria = {
  name: '',
  types: [],
  tiers: [],
  sets: [],
  levelRange: [1, 120],
  restrictions: [],
  majorId: null,
  constraints: [],
  rollBasis: 'possible',
}

describe('filterItems — scalar', () => {
  it('filters by name substring case-insensitively', () => {
    const items = [mk({ name: 'Idol', displayName: 'Idol' }), mk({ name: 'Sword', displayName: 'Sword' })]
    expect(filterItems(items, { ...baseCriteria, name: 'ido' })).toHaveLength(1)
  })
  it('filters by type and level range', () => {
    const items = [mk({ subType: 'bow', level: 10 }), mk({ subType: 'wand', level: 80 })]
    expect(filterItems(items, { ...baseCriteria, types: ['bow'] })).toHaveLength(1)
    expect(filterItems(items, { ...baseCriteria, levelRange: [1, 20] })).toHaveLength(1)
  })
})

describe('filterItems — presence/exclude (legacy parity)', () => {
  const items = [
    mk({ id: 1, displayName: 'A', identifications: { str: { min: 1, max: 5, raw: 3 } } }),
    mk({ id: 2, displayName: 'B', identifications: {} }),
  ]
  it('presence keeps items that carry the ID', () => {
    const c: IdConstraint = { kind: 'id', key: 'str' }
    expect(filterItems(items, { ...baseCriteria, constraints: [c] }).map(i => i.id)).toEqual([1])
  })
  it('exclude drops items that carry the ID', () => {
    const c: IdConstraint = { kind: 'id', key: 'str', exclude: true }
    expect(filterItems(items, { ...baseCriteria, constraints: [c] }).map(i => i.id)).toEqual([2])
  })
})

describe('filterItems — value threshold + rollBasis', () => {
  const items = [
    mk({ id: 1, displayName: 'A', identifications: { strengthPoints: { min: 3, max: 13, raw: 10 } } }),
    mk({ id: 2, displayName: 'B', identifications: { strengthPoints: { min: 1, max: 5, raw: 4 } } }),
    mk({ id: 3, displayName: 'C', identifications: {} }),
  ]
  const minTen: IdConstraint = { kind: 'id', key: 'strengthPoints', min: 10 }
  it('possible: max-roll ≥ N — A (max 13) passes, B (max 5) and C (missing) fail', () => {
    expect(filterItems(items, { ...baseCriteria, constraints: [minTen], rollBasis: 'possible' }).map(i => i.id)).toEqual([1])
  })
  it('guaranteed: high threshold filters all', () => {
    const minFive: IdConstraint = { kind: 'id', key: 'strengthPoints', min: 5 }
    expect(filterItems(items, { ...baseCriteria, constraints: [minFive], rollBasis: 'guaranteed' }).map(i => i.id)).toEqual([])
  })
  it('guaranteed: lower threshold — A (min 3) clears 1, B (min 1) clears 1', () => {
    const minOne: IdConstraint = { kind: 'id', key: 'strengthPoints', min: 1 }
    expect(filterItems(items, { ...baseCriteria, constraints: [minOne], rollBasis: 'guaranteed' }).map(i => i.id)).toEqual([1, 2])
  })
})

describe('filterItems — inverted IDs', () => {
  const items = [
    mk({ id: 1, displayName: 'A', identifications: { '1stSpellCost': { min: -13, max: -3, raw: -10 } } }),
    mk({ id: 2, displayName: 'B', identifications: { '1stSpellCost': { min: -5, max: -1, raw: -3 } } }),
  ]
  it('possible: min ≤ -10 — A clears (-13 ≤ -10)', () => {
    const c: IdConstraint = { kind: 'id', key: '1stSpellCost', min: -10 }
    expect(filterItems(items, { ...baseCriteria, constraints: [c], rollBasis: 'possible' }).map(i => i.id)).toEqual([1])
  })
})

describe('filterItems — sort with rollBasis', () => {
  const items = [
    mk({ id: 1, displayName: 'A', identifications: { strengthPoints: { min: 3, max: 13, raw: 10 } } }),
    mk({ id: 2, displayName: 'B', identifications: { strengthPoints: { min: 7, max: 11, raw: 9 } } }),
  ]
  it('possible+desc: sorts by max (13 > 11 → A, B)', () => {
    const c: IdConstraint = { kind: 'id', key: 'strengthPoints', sort: 'desc' }
    expect(filterItems(items, { ...baseCriteria, constraints: [c], rollBasis: 'possible' }).map(i => i.id)).toEqual([1, 2])
  })
  it('guaranteed+desc: sorts by min (7 > 3 → B, A)', () => {
    const c: IdConstraint = { kind: 'id', key: 'strengthPoints', sort: 'desc' }
    expect(filterItems(items, { ...baseCriteria, constraints: [c], rollBasis: 'guaranteed' }).map(i => i.id)).toEqual([2, 1])
  })
  it('inverts cost-id sort direction', () => {
    // desc on an inverted (cost) ID means "best first" → most-negative favored value first.
    const a = mk({ id: 1, displayName: 'A', identifications: { '1stSpellCost': { min: -13, max: -3, raw: -10 } } })
    const b = mk({ id: 2, displayName: 'B', identifications: { '1stSpellCost': { min: -30, max: -20, raw: -25 } } })
    const c: IdConstraint = { kind: 'id', key: '1stSpellCost', sort: 'desc' }
    const sorted = filterItems([a, b], { ...baseCriteria, constraints: [c], rollBasis: 'possible' })
    expect(sorted.map(i => i.id)).toEqual([2, 1])
  })
})

describe('filterItems — stat-sum filter & sort', () => {
  const items = [
    mk({ id: 1, displayName: 'A', identifications: { rawStrength: { min: 1, max: 5, raw: 3 }, rawDexterity: { min: 2, max: 7, raw: 4 } } }),
    mk({ id: 2, displayName: 'B', identifications: { rawStrength: { min: 0, max: 2, raw: 1 } } }),
  ]
  it('filters by spSum >= N', () => {
    const c: IdConstraint = { kind: 'sum', preset: 'spSum', min: 10 }
    expect(filterItems(items, { ...baseCriteria, constraints: [c] }).map(i => i.id)).toEqual([1])
  })
  it('sorts by spSum desc', () => {
    const c: IdConstraint = { kind: 'sum', preset: 'spSum', sort: 'desc' }
    expect(filterItems(items, { ...baseCriteria, constraints: [c] }).map(i => i.id)).toEqual([1, 2])
  })
})

describe('filterItems — expression constraint', () => {
  const items = [
    mk({ id: 1, displayName: 'A', identifications: { rawStrength: { min: 1, max: 13, raw: 10 }, rawDexterity: { min: 1, max: 5, raw: 3 } } }),
    mk({ id: 2, displayName: 'B', identifications: { rawStrength: { min: 1, max: 3, raw: 2 } } }),
  ]
  it('narrows results', () => {
    const c: IdConstraint = { kind: 'expr', source: 'str + dex >= 15' }
    expect(filterItems(items, { ...baseCriteria, constraints: [c] }).map(i => i.id)).toEqual([1])
  })
})
