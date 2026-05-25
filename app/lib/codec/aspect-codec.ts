import type { BitVectorCursor } from './bit-vector'
import type { EncodingConstants } from './encoding-constants'
import { bitlen, flags, num } from './codec-util'
import { EncodingBitVector } from './encoding-bit-vector'

/** aspects: per-slot [id, tier] (tier is 1-based) or null for an unused slot. */
export function encodeAspects(aspects: Array<[number, number] | null>, enc: EncodingConstants): EncodingBitVector {
  const vec = new EncodingBitVector(0, 0, enc)
  if (aspects.every(a => a === null)) {
    vec.appendFlag('ASPECTS_FLAG', 'NO_ASPECTS')
    return vec
  }
  vec.appendFlag('ASPECTS_FLAG', 'HAS_ASPECTS')
  for (const slot of aspects) {
    if (slot === null) {
      vec.appendFlag('ASPECT_SLOT_FLAG', 'UNUSED')
    }
    else {
      const [id, tier] = slot
      vec.appendFlag('ASPECT_SLOT_FLAG', 'USED')
      vec.append(id, num(enc, 'ASPECT_ID_BITLEN'))
      vec.append(tier - 1, num(enc, 'ASPECT_TIER_BITLEN'))
    }
  }
  return vec
}

export function decodeAspects(cursor: BitVectorCursor, dec: EncodingConstants): Array<[number, number] | null> {
  const ASPECTS_FLAG = flags(dec, 'ASPECTS_FLAG')
  const SLOT = flags(dec, 'ASPECT_SLOT_FLAG')
  const numAspects = num(dec, 'NUM_ASPECTS')
  const aspects: Array<[number, number] | null> = []
  if (cursor.advanceBy(bitlen(dec, 'ASPECTS_FLAG')) === ASPECTS_FLAG.NO_ASPECTS) {
    for (let i = 0; i < numAspects; ++i)
      aspects.push(null)
    return aspects
  }
  for (let i = 0; i < numAspects; ++i) {
    if (cursor.advanceBy(bitlen(dec, 'ASPECT_SLOT_FLAG')) === SLOT.USED) {
      const id = cursor.advanceBy(num(dec, 'ASPECT_ID_BITLEN'))
      const tier = cursor.advanceBy(num(dec, 'ASPECT_TIER_BITLEN'))
      aspects.push([id, tier + 1])
    }
    else {
      aspects.push(null)
    }
  }
  return aspects
}
