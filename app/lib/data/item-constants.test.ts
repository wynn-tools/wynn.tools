import { describe, expect, it } from 'vitest'
import { isNoneItem, ITEM_TYPES, NONE_ITEMS } from './item-constants'

describe('item constants', () => {
  it('lists all 9 equip slot types', () => {
    expect(ITEM_TYPES).toEqual([
      'helmet',
      'chestplate',
      'leggings',
      'boots',
      'ring',
      'bracelet',
      'necklace',
      'dagger',
      'wand',
      'bow',
      'spear',
      'relik',
    ])
  })

  it('defines exactly 9 none items with ids 10000-10008', () => {
    expect(NONE_ITEMS).toHaveLength(9)
    expect(NONE_ITEMS.map(i => i.id)).toEqual([
      10000,
      10001,
      10002,
      10003,
      10004,
      10005,
      10006,
      10007,
      10008,
    ])
    expect(NONE_ITEMS[0]!.name).toBe('No Helmet')
    expect(NONE_ITEMS[8]!.name).toBe('No Weapon')
  })

  it('recognizes none item names', () => {
    expect(isNoneItem('No Helmet')).toBe(true)
    expect(isNoneItem('No Weapon')).toBe(true)
    expect(isNoneItem('Adherence')).toBe(false)
  })
})
