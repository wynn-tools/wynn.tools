import type { AtreeData, AtreeNode } from '../types/atree'
import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import type { EquipmentSlot } from './equipment-codec'
import { getSortedClassAtree } from '../atree/build-atree'
import { decodeAspects, encodeAspects } from './aspect-codec'
import { decodeAtree, encodeAtree } from './atree-codec'
import { BitVector, BitVectorCursor as Cursor } from './bit-vector'
import { num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'
import { decodeEquipment, encodeEquipment } from './equipment-codec'
import { decodeHeader, encodeHeader } from './header'
import { decodeLevel, encodeLevel } from './level-codec'
import { decodeSp } from './skillpoints-codec'
import { decodeTomes, encodeTomes } from './tome-codec'
import { WEP_TO_CLASS } from './wep-to-class'

/** The exact decoded representation of a build, sufficient to re-encode byte-for-byte. */
export interface RawBuild {
  versionId: number
  /**
   * Tagged-union per equipment slot. NORMAL slots wrap a numeric item id (or
   * null for empty); CRAFTED slots wrap a RawCraft. Slot indices 0..7 are
   * helmet..necklace; index 8 is the weapon.
   */
  equipment: EquipmentSlot[]
  powders: number[][]
  tomeIds: Array<number | null>
  sp: Array<number | null> | null
  level: number
  aspects: Array<[number, number] | null>
  activeAtree: number[]
}

export interface DecodeProvider {
  (versionId: number): {
    enc: EncodingConstants
    atreeData: AtreeData
    weaponType: (id: number) => string | null
    /**
     * Lookup that returns whether a crafted recipe id resolves to a weapon
     * recipe — controls whether atk-spd bits follow in the craft-codec.
     * Tests with no crafted slots can return false unconditionally.
     */
    recipeIsWeapon: (recipeId: number) => boolean
  }
}

/**
 * Return the resolved item id for a NORMAL equipment slot. Returns null for
 * CRAFTED slots or empty NORMAL slots. Use this when consumers need a numeric
 * id (e.g. to look up via the item index, set a powder cap, etc.).
 */
export function slotItemId(slot: EquipmentSlot | undefined): number | null {
  if (!slot || slot.kind !== 'normal')
    return null
  return slot.id
}

/** Re-emit skillpoints exactly as decodeSp produced them (no delta model). */
function reencodeSp(sp: Array<number | null> | null, enc: EncodingConstants): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  if (sp === null) {
    vec.appendFlag('SP_FLAG', 'AUTOMATIC')
    return vec
  }
  vec.appendFlag('SP_FLAG', 'ASSIGNED')
  const maxSpBitlen = num(enc, 'MAX_SP_BITLEN')
  for (const value of sp) {
    if (value === null) {
      vec.appendFlag('SP_ELEMENT_FLAG', 'ELEMENT_UNASSIGNED')
    }
    else {
      vec.appendFlag('SP_ELEMENT_FLAG', 'ELEMENT_ASSIGNED')
      vec.append(value & ((1 << maxSpBitlen) - 1), maxSpBitlen)
    }
  }
  return vec
}

export function encodeRawBuild(raw: RawBuild, enc: EncodingConstants, sortedTree: AtreeNode[]): string {
  const finalVec = new EncodingBitVector(0, 0, enc)
  finalVec.merge([
    encodeHeader(raw.versionId),
    encodeEquipment(raw.equipment, raw.powders, enc),
    encodeTomes(raw.tomeIds, enc),
    reencodeSp(raw.sp, enc),
    encodeLevel(raw.level, enc),
    encodeAspects(raw.aspects, enc),
    encodeAtree(sortedTree, new Set(raw.activeAtree)),
  ])
  return finalVec.toB64()
}

export function decodeRawBuild(hash: string, provider: DecodeProvider): RawBuild {
  const vec = new BitVector(hash, hash.length * 6)
  const cursor: BitVectorCursor = new Cursor(vec)
  const versionId = decodeHeader(cursor)
  const { enc, atreeData, weaponType, recipeIsWeapon } = provider(versionId)

  const { slots: equipment, powders } = decodeEquipment(cursor, enc, id => id, recipeIsWeapon)
  const tomeIds = decodeTomes(cursor, enc)
  const sp = decodeSp(cursor, enc)
  const level = decodeLevel(cursor, enc)
  const aspects = decodeAspects(cursor, enc)

  // Weapon class is only meaningful for NORMAL weapons. CRAFTED weapons carry
  // a recipe id whose type lookup belongs to the build-data layer (Task 11);
  // they bypass atree sorting here (no class derivation), so the atree is
  // empty for crafted-weapon builds at the codec layer.
  const weaponSlot = equipment[8]
  const weaponId = slotItemId(weaponSlot)
  const wType = weaponId === null || weaponId === undefined ? null : weaponType(weaponId)
  const cls = wType ? WEP_TO_CLASS[wType] : undefined
  const sortedTree = cls ? getSortedClassAtree(atreeData, cls) : []
  const activeAtree = [...decodeAtree(sortedTree, cursor)]

  return { versionId, equipment, powders, tomeIds, sp, level, aspects, activeAtree }
}
