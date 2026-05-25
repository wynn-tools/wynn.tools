import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { bitlen, flags, num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'

/** finalSp/originalSp are 5-element arrays in etwfa order. */
export function encodeSp(finalSp: number[], originalSp: number[], enc: EncodingConstants): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  const deltas = finalSp.map((x, i) => x - originalSp[i]!)
  if (deltas.every(d => d === 0)) {
    vec.appendFlag('SP_FLAG', 'AUTOMATIC')
    return vec
  }
  vec.appendFlag('SP_FLAG', 'ASSIGNED')
  const maxSpBitlen = num(enc, 'MAX_SP_BITLEN')
  for (const [i, sp] of finalSp.entries()) {
    if (deltas[i] === 0) {
      vec.appendFlag('SP_ELEMENT_FLAG', 'ELEMENT_UNASSIGNED')
    }
    else {
      vec.appendFlag('SP_ELEMENT_FLAG', 'ELEMENT_ASSIGNED')
      const trunc = sp & ((1 << maxSpBitlen) - 1)
      vec.append(trunc, maxSpBitlen)
    }
  }
  return vec
}

/** Returns null for AUTOMATIC, else a 5-element array where unassigned elements are null. */
export function decodeSp(cursor: BitVectorCursor, dec: EncodingConstants): Array<number | null> | null {
  const SP_FLAG = flags(dec, 'SP_FLAG')
  if (cursor.advanceBy(bitlen(dec, 'SP_FLAG')) === SP_FLAG.AUTOMATIC)
    return null
  const ELEM = flags(dec, 'SP_ELEMENT_FLAG')
  const maxSpBitlen = num(dec, 'MAX_SP_BITLEN')
  const skillpoints: Array<number | null> = []
  for (let i = 0; i < num(dec, 'SP_TYPES'); ++i) {
    if (cursor.advanceBy(bitlen(dec, 'SP_ELEMENT_FLAG')) === ELEM.ELEMENT_ASSIGNED) {
      const extension = 32 - maxSpBitlen
      const skp = (cursor.advanceBy(maxSpBitlen) << extension) >> extension
      skillpoints.push(skp)
    }
    else {
      skillpoints.push(null)
    }
  }
  return skillpoints
}
