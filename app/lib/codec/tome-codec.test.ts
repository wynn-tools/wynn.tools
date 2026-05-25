import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { BitVectorCursor } from './bit-vector'
import { decodeTomes, encodeTomes } from './tome-codec'

function roundTrip(tomeIds: Array<number | null>): Array<number | null> {
  const vec = encodeTomes(tomeIds, SYNTHETIC_ENC)
  return decodeTomes(new BitVectorCursor(vec), SYNTHETIC_ENC)
}

describe('tome codec', () => {
  it('all-empty encodes NO_TOMES and decodes to 7 nulls', () => {
    expect(roundTrip([null, null, null, null, null, null, null]))
      .toEqual([null, null, null, null, null, null, null])
  })

  it('round-trips a mix of used and unused slots', () => {
    const ids = [10, null, 20, null, null, 30, null]
    expect(roundTrip(ids)).toEqual(ids)
  })
})
