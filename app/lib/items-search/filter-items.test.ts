import type { ItemCriteria, SearchItem } from './types'
import { describe, expect, it } from 'vitest'
import { filterItems } from './filter-items'

function base(): ItemCriteria {
  return { name: '', types: [], tiers: [], levelRange: [1, 110], restrictions: [], majorId: null, identifications: [], idSorts: [] }
}

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
    ...p,
  }
}

describe('filterItems', () => {
  it('filters by name substring case-insensitively', () => {
    const items = [mk({ displayName: 'Idol' }), mk({ displayName: 'Sword' })]
    expect(filterItems(items, { ...base(), name: 'ido' })).toHaveLength(1)
  })

  it('filters by type and level range', () => {
    const items = [mk({ subType: 'bow', level: 10 }), mk({ subType: 'wand', level: 80 })]
    expect(filterItems(items, { ...base(), types: ['bow'] })).toHaveLength(1)
    expect(filterItems(items, { ...base(), levelRange: [1, 20] })).toHaveLength(1)
  })

  it('include vs exclude identifications', () => {
    const a = mk({ displayName: 'A', identifications: { spellDamage: { min: 1, max: 2, raw: 2 } } })
    const b = mk({ displayName: 'B', identifications: {} })
    expect(filterItems([a, b], { ...base(), identifications: [{ key: 'spellDamage', exclude: false }] })).toEqual([a])
    expect(filterItems([a, b], { ...base(), identifications: [{ key: 'spellDamage', exclude: true }] })).toEqual([b])
  })

  it('sorts by id raw desc, missing last', () => {
    const a = mk({ displayName: 'A', identifications: { manaRegen: { min: 0, max: 0, raw: 5 } } })
    const b = mk({ displayName: 'B', identifications: { manaRegen: { min: 0, max: 0, raw: 9 } } })
    const c = mk({ displayName: 'C', identifications: {} })
    const sorted = filterItems([a, b, c], { ...base(), idSorts: [{ key: 'manaRegen', dir: 'desc' }] })
    expect(sorted.map(i => i.displayName)).toEqual(['B', 'A', 'C'])
  })

  it('inverts cost-id sort direction', () => {
    const a = mk({ displayName: 'A', identifications: { '1stSpellCost': { min: 0, max: 0, raw: -10 } } })
    const b = mk({ displayName: 'B', identifications: { '1stSpellCost': { min: 0, max: 0, raw: -30 } } })
    const sorted = filterItems([a, b], { ...base(), idSorts: [{ key: '1stSpellCost', dir: 'desc' }] })
    expect(sorted.map(i => i.displayName)).toEqual(['B', 'A'])
  })
})
