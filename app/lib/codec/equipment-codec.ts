import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { bitlen, flags, num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'
import { decodePowders, encodePowders } from './powder-codec'

/** Indices of powderable equipment slots -> their index in the build powders array. */
const POWDERABLE = new Map([0, 1, 2, 3, 8].map((x, i) => [x, i] as const))

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
