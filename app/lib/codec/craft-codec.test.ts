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
    const weaponVec = encodeCraft({ ...raw, atkSpdOverride: 'SLOW' }, SYNTHETIC_ENC, true)
    const nonWeaponVec = encodeCraft(raw, SYNTHETIC_ENC, false)
    expect(weaponVec.length - nonWeaponVec.length).toBe(CRAFT_ENC.ATK_SPD_BITLEN)
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
    // Skip version (7) + recipeId (12), then read first ingredient id (12 bits).
    const cursor = new BitVectorCursor(vec)
    cursor.advanceBy(CRAFT_ENC.VERSION_BITLEN)
    cursor.advanceBy(CRAFT_ENC.RECIPE_ID_BITLEN)
    const firstIng = cursor.advanceBy(CRAFT_ENC.ING_ID_BITLEN)
    expect(firstIng).toBe(4095)

    const decoded = decodeCraft(new BitVectorCursor(vec), () => false)
    expect(decoded.ingredientIds.every(x => x === null)).toBe(true)
  })

  it('throws CraftCodecError on version mismatch', () => {
    // Hand-craft a bit vector starting with version=0 (not CURRENT_VERSION=1).
    const vec = new BitVector(0, 0)
    vec.append(0, CRAFT_ENC.VERSION_BITLEN) // wrong version
    vec.append(0, CRAFT_ENC.RECIPE_ID_BITLEN)
    for (let i = 0; i < 6; i++) vec.append(0, CRAFT_ENC.ING_ID_BITLEN)
    for (let i = 0; i < 2; i++) vec.append(0, CRAFT_ENC.MAT_TIER_BITLEN)
    expect(() => decodeCraft(new BitVectorCursor(vec), () => false)).toThrow(CraftCodecError)
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
