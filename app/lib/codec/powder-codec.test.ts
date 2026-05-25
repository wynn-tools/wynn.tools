import { describe, expect, it } from 'vitest'
import { POWDER_TIERS } from '../data/powder-constants'
import { collectPowders, decodePowderIdx, encodePowderIdx } from './powder-codec'

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
