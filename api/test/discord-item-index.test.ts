import { describe, expect, it } from 'vitest'
import { createItemIndex } from '../src/services/discord-interactions/item-index'

const fixture = [
  { id: 1, name: 'Warp', rarity: 'legendary', type: 'wand', tier: null, requirements: {}, identifications: {} },
  { id: 2, name: 'Warchief', rarity: 'fabled', type: 'helmet', tier: null, requirements: {}, identifications: {} },
  { id: 3, name: 'Boreal Mantle', rarity: 'legendary', type: 'chestplate', tier: null, requirements: {}, identifications: {} },
  { id: 4, name: 'War', rarity: 'rare', type: 'spear', tier: null, requirements: {}, identifications: {} },
]

describe('itemIndex', () => {
  const index = createItemIndex(fixture)

  it('ranks exact match first', () => {
    const out = index.suggest('war').map(i => i.name)
    expect(out[0]).toBe('War')
    expect(out).toContain('Warp')
    expect(out).toContain('Warchief')
  })

  it('returns substring matches', () => {
    const out = index.suggest('ant').map(i => i.name)
    expect(out).toContain('Boreal Mantle')
  })

  it('returns fuzzy matches within distance 2', () => {
    const out = index.suggest('warhcief').map(i => i.name)
    expect(out).toContain('Warchief')
  })

  it('caps at 25 results', () => {
    const big = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item${i}`, rarity: 'common', type: 'wand', tier: null, requirements: {}, identifications: {} }))
    expect(createItemIndex(big).suggest('item').length).toBe(25)
  })

  it('lookup by name is case-insensitive', () => {
    expect(index.get('warp')?.id).toBe(1)
    expect(index.get('WARP')?.id).toBe(1)
  })
})
