import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { BitVectorCursor } from './bit-vector'
import { decodeSp, encodeSp } from './skillpoints-codec'

describe('skillpoints codec', () => {
  it('automatic when no deltas', () => {
    const vec = encodeSp([10, 20, 30, 40, 50], [10, 20, 30, 40, 50], SYNTHETIC_ENC)
    expect(decodeSp(new BitVectorCursor(vec), SYNTHETIC_ENC)).toBeNull()
  })

  it('round-trips assigned values incl. negatives', () => {
    const final = [5, 0, -3, 100, -50]
    const original = [0, 0, 0, 0, 0]
    const vec = encodeSp(final, original, SYNTHETIC_ENC)
    const out = decodeSp(new BitVectorCursor(vec), SYNTHETIC_ENC)!
    expect(out[0]).toBe(5)
    expect(out[1]).toBeNull()
    expect(out[2]).toBe(-3)
    expect(out[3]).toBe(100)
    expect(out[4]).toBe(-50)
  })
})
