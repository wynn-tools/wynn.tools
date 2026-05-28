import type { RawCraft } from '../crafter/types'
import type { EquipmentSlot } from './equipment-codec'
import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { BitVectorCursor } from './bit-vector'
import { EncodingBitVector } from './encoding-bit-vector'
import {
  decodeEquipment,
  decodeEquipmentNormal,
  encodeEquipment,
  encodeEquipmentNormal,
} from './equipment-codec'

const identity = (id: number) => id
const notWeapon = () => false

describe('equipment codec (NORMAL)', () => {
  it('round-trips item ids and empty slots', () => {
    const ids = [100, 200, 300, 400, 500, 600, 700, 800, 900]
    const vec = encodeEquipmentNormal(ids, [[], [], [], [], []], SYNTHETIC_ENC)
    const out = decodeEquipmentNormal(new BitVectorCursor(vec), SYNTHETIC_ENC, identity)
    expect(out.ids).toEqual(ids)
  })

  it('handles empty slots (null) as id 0', () => {
    const ids = [null, 200, 300, 400, 500, 600, 700, 800, null]
    const vec = encodeEquipmentNormal(ids, [[], [], [], [], []], SYNTHETIC_ENC)
    const out = decodeEquipmentNormal(new BitVectorCursor(vec), SYNTHETIC_ENC, identity)
    expect(out.ids[0]).toBeNull()
    expect(out.ids[8]).toBeNull()
  })

  it('round-trips per-slot powders', () => {
    const ids = [100, 200, 300, 400, 500, 600, 700, 800, 900]
    const powders = [[26, 26], [], [12], [], [5]]
    const vec = encodeEquipmentNormal(ids, powders, SYNTHETIC_ENC)
    const out = decodeEquipmentNormal(new BitVectorCursor(vec), SYNTHETIC_ENC, identity)
    expect(out.powders[0]).toEqual([26, 26])
    expect(out.powders[2]).toEqual([12])
    expect(out.powders[4]).toEqual([5])
  })
})

describe('equipment codec (tagged union)', () => {
  it('decodes bit vector from encodeEquipmentNormal as all-normal slots', () => {
    const ids = [100, null, 300, 400, 500, 600, 700, 800, 900]
    const powders = [[26, 26], [], [12], [], [5]]
    const vec = encodeEquipmentNormal(ids, powders, SYNTHETIC_ENC)
    const out = decodeEquipment(
      new BitVectorCursor(vec),
      SYNTHETIC_ENC,
      identity,
      notWeapon,
    )
    expect(out.slots).toHaveLength(9)
    for (const [i, slot] of out.slots.entries()) {
      expect(slot.kind).toBe('normal')
      expect(slot.kind === 'normal' && slot.id).toBe(ids[i])
    }
    expect(out.powders[0]).toEqual([26, 26])
    expect(out.powders[2]).toEqual([12])
    expect(out.powders[4]).toEqual([5])
  })

  it('round-trips 9-slot equipment with crafted slots at indices 1 and 3', () => {
    const armorCraft: RawCraft = {
      recipeId: 42,
      ingredientIds: [1, 2, null, 4, null, null],
      matTiers: [1, 3],
      atkSpdOverride: null,
      powders: [],
    }
    const weaponCraft: RawCraft = {
      recipeId: 77,
      ingredientIds: [10, null, 30, 40, 50, 60],
      matTiers: [2, 2],
      atkSpdOverride: 'FAST',
      powders: [],
    }
    const slots: EquipmentSlot[] = [
      { kind: 'normal', id: 100 },
      { kind: 'crafted', raw: armorCraft, recipeIsWeapon: false },
      { kind: 'normal', id: 300 },
      { kind: 'crafted', raw: weaponCraft, recipeIsWeapon: true },
      { kind: 'normal', id: 500 },
      { kind: 'normal', id: 600 },
      { kind: 'normal', id: 700 },
      { kind: 'normal', id: 800 },
      { kind: 'normal', id: null },
    ]
    const powders = [[26, 26], [12], [], [5], [3, 3]]
    const vec = encodeEquipment(slots, powders, SYNTHETIC_ENC)
    const out = decodeEquipment(
      new BitVectorCursor(vec),
      SYNTHETIC_ENC,
      identity,
      (recipeId: number) => recipeId === 77,
    )
    expect(out.slots).toEqual(slots)
    expect(out.powders[0]).toEqual([26, 26])
    expect(out.powders[1]).toEqual([12])
    expect(out.powders[3]).toEqual([5])
    expect(out.powders[4]).toEqual([3, 3])
  })

  it('throws on CUSTOM kind', () => {
    const KIND = SYNTHETIC_ENC.EQUIPMENT_KIND
    const vec = new EncodingBitVector(0, 0, SYNTHETIC_ENC)
    vec.append(KIND.CUSTOM!, KIND.BITLEN)
    expect(() =>
      decodeEquipment(new BitVectorCursor(vec), SYNTHETIC_ENC, identity, notWeapon),
    ).toThrow(/custom equipment/)
  })
})
