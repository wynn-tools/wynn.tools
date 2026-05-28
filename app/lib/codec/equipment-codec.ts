import type { RawCraft } from '../crafter/types'
import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { bitlen, flags, num } from './codec-util'
import { decodeCraft, encodeCraft } from './craft-codec'
import { EncodingBitVector } from './encoding-bit-vector'
import { decodePowders, encodePowders } from './powder-codec'

/** Indices of powderable equipment slots -> their index in the build powders array. */
const POWDERABLE = new Map([0, 1, 2, 3, 8].map((x, i) => [x, i] as const))

/**
 * Tagged-union representation of a single equipment slot. Crafted slots carry
 * the full RawCraft plus whether the recipe is a weapon (controls atk-spd bits
 * in the craft sub-codec). CUSTOM is reserved and currently unsupported.
 */
export type EquipmentSlot
  = | { kind: 'normal', id: number | null }
    | { kind: 'crafted', raw: RawCraft, recipeIsWeapon: boolean }

/**
 * Encode NORMAL-item equipment. ids[i] is the item id for slot i, or null for empty.
 * powdersBySlot is keyed by build-powders index (0..4 for slots 0,1,2,3,8).
 * Crafted/custom are out of scope (4b).
 */
export function encodeEquipmentNormal(
  ids: Array<number | null>,
  powdersBySlot: number[][],
  enc: EncodingConstants,
): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  const KIND = flags(enc, 'EQUIPMENT_KIND')
  for (const [idx, id] of ids.entries()) {
    vec.append(KIND.NORMAL!, bitlen(enc, 'EQUIPMENT_KIND'))
    vec.append(id === null ? 0 : id + 1, num(enc, 'ITEM_ID_BITLEN'))
    if (POWDERABLE.has(idx))
      vec.merge([encodePowders(powdersBySlot[POWDERABLE.get(idx)!] ?? [], enc)])
  }
  return vec
}

/**
 * Decode NORMAL-item equipment. resolveId maps an encoded id to the final item id
 * (inject the item db's redirect-resolving lookup; identity for unit tests).
 */
export function decodeEquipmentNormal(
  cursor: BitVectorCursor,
  dec: EncodingConstants,
  resolveId: (id: number) => number | null,
): { ids: Array<number | null>, powders: number[][] } {
  const KIND = flags(dec, 'EQUIPMENT_KIND')
  const POWDERS_FLAG = flags(dec, 'EQUIPMENT_POWDERS_FLAG')
  const ids: Array<number | null> = []
  const powders: number[][] = []
  for (let i = 0; i < num(dec, 'EQUIPMENT_NUM'); ++i) {
    const kind = cursor.advanceBy(bitlen(dec, 'EQUIPMENT_KIND'))
    if (kind !== KIND.NORMAL)
      throw new Error('crafted/custom equipment not yet supported (4b)')
    const raw = cursor.advanceBy(num(dec, 'ITEM_ID_BITLEN'))
    ids.push(raw === 0 ? null : resolveId(raw - 1))
    if (POWDERABLE.has(i)) {
      if (cursor.advanceBy(bitlen(dec, 'EQUIPMENT_POWDERS_FLAG')) === POWDERS_FLAG.HAS_POWDERS)
        powders.push(decodePowders(cursor, dec))
      else
        powders.push([])
    }
  }
  return { ids, powders }
}

/**
 * Encode equipment with full tagged-union support (NORMAL + CRAFTED).
 * Per-slot wire format:
 *   - EQUIPMENT_KIND (2 bits)
 *   - if NORMAL:  ITEM_ID_BITLEN bits (id+1; 0 = null)
 *   - if CRAFTED: craft-codec bits (encodeCraft, recipeIsWeapon-aware)
 *   - if slot is powderable (∈ {0,1,2,3,8}): powder bits via encodePowders
 */
export function encodeEquipment(
  slots: EquipmentSlot[],
  powdersBySlot: number[][],
  enc: EncodingConstants,
): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  const KIND = flags(enc, 'EQUIPMENT_KIND')
  for (const [idx, slot] of slots.entries()) {
    if (slot.kind === 'normal') {
      vec.append(KIND.NORMAL!, bitlen(enc, 'EQUIPMENT_KIND'))
      vec.append(slot.id === null ? 0 : slot.id + 1, num(enc, 'ITEM_ID_BITLEN'))
    }
    else if (slot.kind === 'crafted') {
      vec.append(KIND.CRAFTED!, bitlen(enc, 'EQUIPMENT_KIND'))
      vec.merge([encodeCraft(slot.raw, enc, slot.recipeIsWeapon)])
    }
    if (POWDERABLE.has(idx))
      vec.merge([encodePowders(powdersBySlot[POWDERABLE.get(idx)!] ?? [], enc)])
  }
  return vec
}

/**
 * Decode equipment with full tagged-union support. `resolveId` maps an encoded
 * normal-item id to the final item id (identity in tests). `recipeIsWeaponLookup`
 * is forwarded to `decodeCraft` to decide whether atk-spd bits follow.
 * Throws on CUSTOM kind (not yet supported).
 */
export function decodeEquipment(
  cursor: BitVectorCursor,
  dec: EncodingConstants,
  resolveId: (id: number) => number | null,
  recipeIsWeaponLookup: (recipeId: number) => boolean,
): { slots: EquipmentSlot[], powders: number[][] } {
  const KIND = flags(dec, 'EQUIPMENT_KIND')
  const POWDERS_FLAG = flags(dec, 'EQUIPMENT_POWDERS_FLAG')
  const slots: EquipmentSlot[] = []
  const powders: number[][] = []
  for (let i = 0; i < num(dec, 'EQUIPMENT_NUM'); ++i) {
    const kind = cursor.advanceBy(bitlen(dec, 'EQUIPMENT_KIND'))
    if (kind === KIND.NORMAL) {
      const raw = cursor.advanceBy(num(dec, 'ITEM_ID_BITLEN'))
      slots.push({ kind: 'normal', id: raw === 0 ? null : resolveId(raw - 1) })
    }
    else if (kind === KIND.CRAFTED) {
      const craft = decodeCraft(cursor, recipeIsWeaponLookup)
      slots.push({ kind: 'crafted', raw: craft, recipeIsWeapon: craft.atkSpdOverride !== null })
    }
    else if (kind === KIND.CUSTOM) {
      throw new Error('custom equipment not yet supported')
    }
    else {
      throw new Error(`unknown equipment kind: ${kind}`)
    }
    if (POWDERABLE.has(i)) {
      if (cursor.advanceBy(bitlen(dec, 'EQUIPMENT_POWDERS_FLAG')) === POWDERS_FLAG.HAS_POWDERS)
        powders.push(decodePowders(cursor, dec))
      else
        powders.push([])
    }
  }
  return { slots, powders }
}
