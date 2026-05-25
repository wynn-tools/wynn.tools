import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { BitVectorCursor } from './bit-vector'
import { decodeLevel, encodeLevel } from './level-codec'

describe('level codec', () => {
  it('round-trips max level via the MAX flag', () => {
    const vec = encodeLevel(106, SYNTHETIC_ENC)
    expect(decodeLevel(new BitVectorCursor(vec), SYNTHETIC_ENC)).toBe(106)
  })
  it('round-trips other levels', () => {
    for (const lvl of [1, 50, 105]) {
      const vec = encodeLevel(lvl, SYNTHETIC_ENC)
      expect(decodeLevel(new BitVectorCursor(vec), SYNTHETIC_ENC)).toBe(lvl)
    }
  })
})
