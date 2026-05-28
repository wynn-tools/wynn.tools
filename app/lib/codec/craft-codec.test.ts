import type { RawCraft } from '../crafter/types'
import { describe, expect, it, vi } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { BitVector, BitVectorCursor } from './bit-vector'
import { CRAFT_ENC, CraftCodecError, decodeCraft, encodeCraft } from './craft-codec'

function roundTrip(raw: RawCraft, recipeIsWeapon: boolean): RawCraft {
  const vec = encodeCraft(raw, SYNTHETIC_ENC, recipeIsWeapon)
  const cursor = new BitVectorCursor(vec)
  return decodeCraft(cursor, () => recipeIsWeapon)
}

describe('craft codec', () => {
  it('round-trips a weapon craft with all non-null ingredients', () => {
    const raw: RawCraft = {
      recipeId: 42,
      ingredientIds: [1, 2, 3, 4, 5, 6],
      matTiers: [1, 3],
      atkSpdOverride: 'FAST',
      powders: [],
    }
    const decoded = roundTrip(raw, true)
    expect(decoded.recipeId).toBe(42)
    expect(decoded.ingredientIds).toEqual([1, 2, 3, 4, 5, 6])
    expect(decoded.matTiers).toEqual([1, 3])
    expect(decoded.atkSpdOverride).toBe('FAST')
  })

  it('round-trips a non-weapon craft (no atk-spd bits emitted)', () => {
    const raw: RawCraft = {
      recipeId: 7,
      ingredientIds: [10, null, 12, null, 14, null],
      matTiers: [2, 2],
      atkSpdOverride: null,
      powders: [],
    }
    const decoded = roundTrip(raw, false)
    expect(decoded.recipeId).toBe(7)
    expect(decoded.ingredientIds).toEqual([10, null, 12, null, 14, null])
    expect(decoded.matTiers).toEqual([2, 2])
    expect(decoded.atkSpdOverride).toBeNull()
  })

  it('non-weapon recipes do not emit atk-spd bits', () => {
    const raw: RawCraft = {
      recipeId: 1,
      ingredientIds: [null, null, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }
    // Without atk-spd, the cursor should land at the end of the non-weapon payload.
    // Payload = 1 + 7 + 6*12 + 12 + 2*3 = 98 bits for non-weapon; +4 = 102 for weapon.
    const nonWeaponVec = encodeCraft(raw, SYNTHETIC_ENC, false)
    const weaponVec = encodeCraft({ ...raw, atkSpdOverride: 'SLOW' }, SYNTHETIC_ENC, true)
    const expectedNonWeaponBits
      = CRAFT_ENC.LEGACY_BITLEN
        + CRAFT_ENC.VERSION_BITLEN
        + CRAFT_ENC.NUM_INGS * CRAFT_ENC.ING_ID_BITLEN
        + CRAFT_ENC.RECIPE_ID_BITLEN
        + CRAFT_ENC.NUM_MATS * CRAFT_ENC.MAT_TIER_BITLEN
    const expectedNonWeaponPadded = expectedNonWeaponBits + ((6 - (expectedNonWeaponBits % 6)) % 6)
    const expectedWeaponBits = expectedNonWeaponBits + CRAFT_ENC.ATK_SPD_BITLEN
    const expectedWeaponPadded = expectedWeaponBits + ((6 - (expectedWeaponBits % 6)) % 6)
    expect(nonWeaponVec.length).toBe(expectedNonWeaponPadded)
    expect(weaponVec.length).toBe(expectedWeaponPadded)
  })

  it('round-trips 5 randomized RawCraft values', () => {
    const rand = (n: number) => Math.floor(Math.random() * n)
    const atkSpds = ['SLOW', 'NORMAL', 'FAST'] as const
    for (let i = 0; i < 5; i++) {
      const isWeapon = rand(2) === 0
      const ings: (number | null)[] = []
      for (let k = 0; k < 6; k++) {
        ings.push(rand(2) === 0 ? null : rand(4094))
      }
      const tiers = [(rand(3) + 1) as 1 | 2 | 3, (rand(3) + 1) as 1 | 2 | 3] as [1 | 2 | 3, 1 | 2 | 3]
      const raw: RawCraft = {
        recipeId: rand(4095),
        ingredientIds: ings,
        matTiers: tiers,
        atkSpdOverride: isWeapon ? atkSpds[rand(3)]! : null,
        powders: [],
      }
      const decoded = roundTrip(raw, isWeapon)
      expect(decoded.recipeId).toBe(raw.recipeId)
      expect(decoded.ingredientIds).toEqual(raw.ingredientIds)
      expect(decoded.matTiers).toEqual(raw.matTiers)
      expect(decoded.atkSpdOverride).toBe(raw.atkSpdOverride)
    }
  })

  it('null ingredient ids serialize to ING_NULL (4095) and decode back to null', () => {
    const raw: RawCraft = {
      recipeId: 100,
      ingredientIds: [null, null, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }
    const vec = encodeCraft(raw, SYNTHETIC_ENC, false)
    // Skip legacy (1) + version (7), then read first ingredient id (12 bits).
    const cursor = new BitVectorCursor(vec)
    cursor.advanceBy(CRAFT_ENC.LEGACY_BITLEN)
    cursor.advanceBy(CRAFT_ENC.VERSION_BITLEN)
    const firstIng = cursor.advanceBy(CRAFT_ENC.ING_ID_BITLEN)
    expect(firstIng).toBe(4095)

    const decoded = decodeCraft(new BitVectorCursor(vec), () => false)
    expect(decoded.ingredientIds.every(x => x === null)).toBe(true)
  })

  it('throws CraftCodecError on version mismatch', () => {
    // Hand-craft a bit vector with legacy=0 and an unsupported version.
    const vec = new BitVector(0, 0)
    vec.append(0, CRAFT_ENC.LEGACY_BITLEN)
    vec.append(0, CRAFT_ENC.VERSION_BITLEN) // wrong version (CURRENT_VERSION = 2)
    for (let i = 0; i < 6; i++) vec.append(0, CRAFT_ENC.ING_ID_BITLEN)
    vec.append(0, CRAFT_ENC.RECIPE_ID_BITLEN)
    for (let i = 0; i < 2; i++) vec.append(0, CRAFT_ENC.MAT_TIER_BITLEN)
    expect(() => decodeCraft(new BitVectorCursor(vec), () => false)).toThrow(CraftCodecError)
  })

  it('throws a clear error when the legacy bit is set', () => {
    const vec = new BitVector(0, 0)
    vec.append(1, CRAFT_ENC.LEGACY_BITLEN) // legacy = 1
    // Pad with zeros so the cursor has room to read version bits before throwing
    // (the implementation throws as soon as it reads the legacy bit).
    vec.append(0, CRAFT_ENC.VERSION_BITLEN)
    expect(() => decodeCraft(new BitVectorCursor(vec), () => false)).toThrow(/legacy/i)
  })

  it('decodes the real WynnBuilder share hash 4OaaZWnqUSnqUSea0', () => {
    const hash = '4OaaZWnqUSnqUSea0'
    const vec = new BitVector(hash, hash.length * 6)
    const decoded = decodeCraft(new BitVectorCursor(vec), () => false)
    // 6 non-null ingredient ids
    expect(decoded.ingredientIds).toHaveLength(6)
    for (const id of decoded.ingredientIds) {
      expect(id).not.toBeNull()
      expect(typeof id).toBe('number')
    }
    // Both materials are 2★ per the source screenshot (Cinnabar Ingot + Heather String).
    expect(decoded.matTiers).toEqual([2, 2])
    // Leggings → non-weapon, no atk-spd bits.
    expect(decoded.atkSpdOverride).toBeNull()
    expect(typeof decoded.recipeId).toBe('number')
    expect(decoded.powders).toEqual([])
  })

  it('calls recipeIsWeaponLookup exactly once with the decoded recipeId', () => {
    const raw: RawCraft = {
      recipeId: 1234,
      ingredientIds: [1, 2, 3, 4, 5, 6],
      matTiers: [1, 2],
      atkSpdOverride: 'NORMAL',
      powders: [],
    }
    const vec = encodeCraft(raw, SYNTHETIC_ENC, true)
    const lookup = vi.fn((_id: number) => true)
    decodeCraft(new BitVectorCursor(vec), lookup)
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(lookup).toHaveBeenCalledWith(1234)
  })
})
