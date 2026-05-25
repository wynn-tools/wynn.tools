import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { bitlen, flags, num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'

export function encodeLevel(level: number, enc: EncodingConstants): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  if (level === num(enc, 'MAX_LEVEL')) {
    vec.appendFlag('LEVEL_FLAG', 'MAX')
  }
  else {
    vec.appendFlag('LEVEL_FLAG', 'OTHER')
    vec.append(level, num(enc, 'LEVEL_BITLEN'))
  }
  return vec
}

export function decodeLevel(cursor: BitVectorCursor, dec: EncodingConstants): number {
  const LEVEL_FLAG = flags(dec, 'LEVEL_FLAG')
  const flag = cursor.advanceBy(bitlen(dec, 'LEVEL_FLAG'))
  if (flag === LEVEL_FLAG.MAX)
    return num(dec, 'MAX_LEVEL')
  return cursor.advanceBy(num(dec, 'LEVEL_BITLEN'))
}
