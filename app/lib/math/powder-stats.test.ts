import { describe, expect, it } from 'vitest'
import { POWDER_ARMOR_HEALTH, POWDER_STATS } from './powder-stats'

describe('powder stats', () => {
  it('has 35 powders', () => {
    expect(POWDER_STATS).toHaveLength(35)
  })
  it('earth t1 (index 0)', () => {
    expect(POWDER_STATS[0]).toEqual({ min: 4, max: 5, convert: 17, defPlus: 2, defMinus: 1 })
  })
  it('air t7 (index 34)', () => {
    expect(POWDER_STATS[34]).toEqual({ min: 9, max: 17, convert: 42, defPlus: 38, defMinus: 13 })
  })
  it('armor health table', () => {
    expect(POWDER_ARMOR_HEALTH).toEqual([5, 10, 20, 30, 45, 60, 75])
  })
})
