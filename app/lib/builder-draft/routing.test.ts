import { describe, expect, it } from 'vitest'
import { EQUIP_SLOT_COUNT, isEquippable, SLOT, slotsForItem } from './routing'

describe('slotsForItem', () => {
  it('routes armour by subType', () => {
    expect(slotsForItem({ type: 'armour', subType: 'helmet' })).toEqual({ slots: [SLOT.helmet], ambiguous: false })
    expect(slotsForItem({ type: 'armour', subType: 'chestplate' })).toEqual({ slots: [SLOT.chestplate], ambiguous: false })
    expect(slotsForItem({ type: 'armour', subType: 'leggings' })).toEqual({ slots: [SLOT.leggings], ambiguous: false })
    expect(slotsForItem({ type: 'armour', subType: 'boots' })).toEqual({ slots: [SLOT.boots], ambiguous: false })
  })

  it('routes any weapon subType to the single weapon slot', () => {
    for (const subType of ['spear', 'wand', 'dagger', 'bow', 'relik']) {
      expect(slotsForItem({ type: 'weapon', subType })).toEqual({ slots: [SLOT.weapon], ambiguous: false })
    }
  })

  it('routes bracelet and necklace to their single slots', () => {
    expect(slotsForItem({ type: 'accessory', subType: 'bracelet' })).toEqual({ slots: [SLOT.bracelet], ambiguous: false })
    expect(slotsForItem({ type: 'accessory', subType: 'necklace' })).toEqual({ slots: [SLOT.necklace], ambiguous: false })
  })

  it('marks rings ambiguous across both ring slots', () => {
    expect(slotsForItem({ type: 'accessory', subType: 'ring' })).toEqual({
      slots: [SLOT.ring1, SLOT.ring2],
      ambiguous: true,
    })
  })

  it('is case-insensitive on subType', () => {
    expect(slotsForItem({ type: 'armour', subType: 'HELMET' }).slots).toEqual([SLOT.helmet])
    expect(slotsForItem({ type: 'accessory', subType: 'Ring' }).ambiguous).toBe(true)
  })

  it('returns no slots for unknown subtypes', () => {
    expect(slotsForItem({ type: 'armour', subType: 'cape' }).slots).toEqual([])
    expect(slotsForItem({ type: 'accessory', subType: 'charm' }).slots).toEqual([])
  })
})

describe('isEquippable', () => {
  it('is true for real equipment, false otherwise', () => {
    expect(isEquippable({ type: 'weapon', subType: 'bow' })).toBe(true)
    expect(isEquippable({ type: 'accessory', subType: 'ring' })).toBe(true)
    expect(isEquippable({ type: 'armour', subType: 'cape' })).toBe(false)
  })
})

describe('slot ordering', () => {
  it('has nine equipment slots in builder order', () => {
    expect(EQUIP_SLOT_COUNT).toBe(9)
    expect([SLOT.helmet, SLOT.chestplate, SLOT.leggings, SLOT.boots, SLOT.ring1, SLOT.ring2, SLOT.bracelet, SLOT.necklace, SLOT.weapon])
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })
})
