import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { decodeAspects, encodeAspects } from './aspect-codec'
import { BitVectorCursor } from './bit-vector'

function roundTrip(aspects: Array<[number, number] | null>): Array<[number, number] | null> {
  const vec = encodeAspects(aspects, SYNTHETIC_ENC)
  return decodeAspects(new BitVectorCursor(vec), SYNTHETIC_ENC)
}

describe('aspect codec', () => {
  it('all-empty round-trips to NUM_ASPECTS nulls', () => {
    expect(roundTrip([null, null, null, null, null])).toEqual([null, null, null, null, null])
  })

  it('round-trips ids and tiers', () => {
    const aspects: Array<[number, number] | null> = [[5, 1], null, [42, 4], null, [7, 7]]
    expect(roundTrip(aspects)).toEqual(aspects)
  })
})
