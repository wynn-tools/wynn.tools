import type { BitVectorCursor } from './bit-vector'
import { BitVector } from './bit-vector'

export const VECTOR_FLAG = 0xC
export const VERSION_BITLEN = 10

/** Encode the build header: a 6-bit flag (0xC, distinguishing from legacy decimal headers) + 10-bit version id. */
export function encodeHeader(encodingVersion: number): BitVector {
  const headerVec = new BitVector(0, 0)
  headerVec.append(VECTOR_FLAG, 6)
  headerVec.append(encodingVersion, VERSION_BITLEN)
  return headerVec
}

/** Decode the header from a cursor: skip the 6-bit flag, return the 10-bit version id. */
export function decodeHeader(cursor: BitVectorCursor): number {
  cursor.advanceBy(6) // flag, discarded
  return cursor.advanceBy(VERSION_BITLEN)
}
