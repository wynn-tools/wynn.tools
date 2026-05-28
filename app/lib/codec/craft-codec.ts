import type { AtkSpeed, RawCraft } from '../crafter/types'
import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { EncodingBitVector } from './encoding-bit-vector'

export const CRAFT_ENC = {
  VERSION_BITLEN: 7,
  CURRENT_VERSION: 1, // our own v1
  ING_ID_BITLEN: 12,
  RECIPE_ID_BITLEN: 12,
  NUM_INGS: 6,
  NUM_MATS: 2,
  MAT_TIER_BITLEN: 3, // value = tier - 1 (0..2)
  ATK_SPD_BITLEN: 4, // SLOW=0, NORMAL=1, FAST=2
} as const

const ATK_SPD_TO_NUM: Record<AtkSpeed, number> = { SLOW: 0, NORMAL: 1, FAST: 2 }
const NUM_TO_ATK_SPD: AtkSpeed[] = ['SLOW', 'NORMAL', 'FAST']
const ING_NULL = (1 << CRAFT_ENC.ING_ID_BITLEN) - 1 // 4095 sentinel

export class CraftCodecError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CraftCodecError'
  }
}

/**
 * Encode a RawCraft to a bit vector. The `powders` field of `raw` is NOT
 * serialized here — powders ride the build's per-slot powder encoding.
 *
 * Wire layout:
 * 1. version (7 bits)
 * 2. recipeId (12 bits)
 * 3. 6 × ingredientId (12 bits each; null = ING_NULL = 4095)
 * 4. 2 × matTier-1 (3 bits each)
 * 5. atkSpd (4 bits) — only if `recipeIsWeapon`
 */
export function encodeCraft(
  raw: RawCraft,
  enc: EncodingConstants,
  recipeIsWeapon: boolean,
): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  vec.append(CRAFT_ENC.CURRENT_VERSION, CRAFT_ENC.VERSION_BITLEN)
  vec.append(raw.recipeId, CRAFT_ENC.RECIPE_ID_BITLEN)

  for (let i = 0; i < CRAFT_ENC.NUM_INGS; i++) {
    const id = raw.ingredientIds[i] ?? null
    vec.append(id === null ? ING_NULL : id, CRAFT_ENC.ING_ID_BITLEN)
  }

  for (let i = 0; i < CRAFT_ENC.NUM_MATS; i++) {
    const tier = raw.matTiers[i as 0 | 1]
    vec.append(tier - 1, CRAFT_ENC.MAT_TIER_BITLEN)
  }

  if (recipeIsWeapon) {
    const atkSpd = raw.atkSpdOverride ?? 'NORMAL'
    vec.append(ATK_SPD_TO_NUM[atkSpd], CRAFT_ENC.ATK_SPD_BITLEN)
  }

  return vec
}

/**
 * Decode a RawCraft from the cursor. `recipeIsWeaponLookup` is called exactly
 * once with the decoded recipeId to decide whether to read the atk-spd bits.
 * The resulting RawCraft has `powders: []` — callers fill in powders from the
 * separate per-slot powder decoding (build) or a sibling field (standalone).
 */
export function decodeCraft(
  cursor: BitVectorCursor,
  recipeIsWeaponLookup: (recipeId: number) => boolean,
): RawCraft {
  const version = cursor.advanceBy(CRAFT_ENC.VERSION_BITLEN)
  if (version !== CRAFT_ENC.CURRENT_VERSION) {
    throw new CraftCodecError(
      `Unsupported craft codec version: got ${version}, expected ${CRAFT_ENC.CURRENT_VERSION}`,
    )
  }

  const recipeId = cursor.advanceBy(CRAFT_ENC.RECIPE_ID_BITLEN)
  const isWeapon = recipeIsWeaponLookup(recipeId)

  const ingredientIds: (number | null)[] = []
  for (let i = 0; i < CRAFT_ENC.NUM_INGS; i++) {
    const v = cursor.advanceBy(CRAFT_ENC.ING_ID_BITLEN)
    ingredientIds.push(v === ING_NULL ? null : v)
  }

  const matTiersArr: (1 | 2 | 3)[] = []
  for (let i = 0; i < CRAFT_ENC.NUM_MATS; i++) {
    const t = cursor.advanceBy(CRAFT_ENC.MAT_TIER_BITLEN) + 1
    if (t !== 1 && t !== 2 && t !== 3) {
      throw new CraftCodecError(`Invalid material tier: ${t}`)
    }
    matTiersArr.push(t)
  }
  const matTiers: [1 | 2 | 3, 1 | 2 | 3] = [matTiersArr[0]!, matTiersArr[1]!]

  let atkSpdOverride: AtkSpeed | null = null
  if (isWeapon) {
    const n = cursor.advanceBy(CRAFT_ENC.ATK_SPD_BITLEN)
    const spd = NUM_TO_ATK_SPD[n]
    if (spd === undefined) {
      throw new CraftCodecError(`Invalid atk speed code: ${n}`)
    }
    atkSpdOverride = spd
  }

  return {
    recipeId,
    ingredientIds,
    matTiers,
    atkSpdOverride,
    powders: [],
  }
}
