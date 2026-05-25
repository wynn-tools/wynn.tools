import { describe, expect, it } from 'vitest'
import { POWDER_TIERS } from '../data/powder-constants'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { BitVectorCursor } from './bit-vector'
import { bitlen, flags } from './codec-util'
import { collectPowders, decodePowderIdx, decodePowders, encodePowderIdx, encodePowders } from './powder-codec'

function roundTripPowders(ids: number[]): number[] {
  const vec = encodePowders(ids, SYNTHETIC_ENC)
  const cur = new BitVectorCursor(vec)
  const flag = cur.advanceBy(bitlen(SYNTHETIC_ENC, 'EQUIPMENT_POWDERS_FLAG'))
  if (flag === flags(SYNTHETIC_ENC, 'EQUIPMENT_POWDERS_FLAG').NO_POWDERS)
    return []
  return decodePowders(cur, SYNTHETIC_ENC)
}

describe('powder RLE round-trip', () => {
  it('empty set', () => {
    expect(roundTripPowders([])).toEqual([])
  })
  it('single powder', () => {
    expect(roundTripPowders([26])).toEqual([26])
  })
  it('repeats of one powder', () => {
    expect(roundTripPowders([26, 26, 26])).toEqual([26, 26, 26])
  })
  it('same element different tiers then another element', () => {
    expect(roundTripPowders([26, 24, 33]).sort((a, b) => a - b)).toEqual([24, 26, 33])
  })
  it('tier-repeat across elements (e6,t6)', () => {
    expect(roundTripPowders([5, 12]).sort((a, b) => a - b)).toEqual([5, 12])
  })
})

describe('powder helpers', () => {
  it('encode/decode powder idx are identity at 7 tiers', () => {
    for (let id = 0; id < 35; id++)
      expect(decodePowderIdx(encodePowderIdx(id, POWDER_TIERS), POWDER_TIERS)).toBe(id)
  })

  it('collectPowders groups same-element powders in first-seen order', () => {
    const f6 = 26
    const a6 = 33
    const t6 = 12
    const chunks = collectPowders([f6, a6, f6, t6, t6, a6], 5, POWDER_TIERS)
    const nonEmpty = chunks.filter(c => c.length > 0)
    expect(nonEmpty).toEqual([[f6, f6], [a6, a6], [t6, t6]])
  })
})
