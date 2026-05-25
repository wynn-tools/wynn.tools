import { describe, expect, it } from 'vitest'
import { BitVectorCursor } from './bit-vector'
import { EncodingBitVector } from './encoding-bit-vector'

const MOCK = {
  TOMES_FLAG: { BITLEN: 1, NO_TOMES: 0, HAS_TOMES: 1 },
}

describe('encodingBitVector', () => {
  it('appendFlag writes the flag value with the field bitlen', () => {
    const v = new EncodingBitVector(0, 0, MOCK)
    v.appendFlag('TOMES_FLAG', 'HAS_TOMES')
    const cur = new BitVectorCursor(v)
    expect(cur.advanceBy(1)).toBe(1)
  })

  it('appendFlag with a multi-bit field', () => {
    const map = { KIND: { BITLEN: 3, A: 5 } }
    const v = new EncodingBitVector(0, 0, map)
    v.appendFlag('KIND', 'A')
    const cur = new BitVectorCursor(v)
    expect(cur.advanceBy(3)).toBe(5)
  })
})
