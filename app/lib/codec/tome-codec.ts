import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { bitlen, flags, num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'

/** tomeIds: per-slot tome id, or null for an unused slot. */
export function encodeTomes(tomeIds: Array<number | null>, enc: EncodingConstants): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  if (tomeIds.every(t => t === null)) {
    vec.appendFlag('TOMES_FLAG', 'NO_TOMES')
    return vec
  }
  vec.appendFlag('TOMES_FLAG', 'HAS_TOMES')
  for (const id of tomeIds) {
    if (id === null) {
      vec.appendFlag('TOME_SLOT_FLAG', 'UNUSED')
    }
    else {
      vec.appendFlag('TOME_SLOT_FLAG', 'USED')
      vec.append(id, num(enc, 'TOME_ID_BITLEN'))
    }
  }
  return vec
}

export function decodeTomes(cursor: BitVectorCursor, dec: EncodingConstants): Array<number | null> {
  const TOMES_FLAG = flags(dec, 'TOMES_FLAG')
  const SLOT = flags(dec, 'TOME_SLOT_FLAG')
  const tomeNum = num(dec, 'TOME_NUM')
  const tomes: Array<number | null> = []
  if (cursor.advanceBy(bitlen(dec, 'TOMES_FLAG')) === TOMES_FLAG.NO_TOMES) {
    for (let i = 0; i < tomeNum; ++i)
      tomes.push(null)
    return tomes
  }
  for (let i = 0; i < tomeNum; ++i) {
    if (cursor.advanceBy(bitlen(dec, 'TOME_SLOT_FLAG')) === SLOT.USED)
      tomes.push(cursor.advanceBy(num(dec, 'TOME_ID_BITLEN')))
    else
      tomes.push(null)
  }
  return tomes
}
