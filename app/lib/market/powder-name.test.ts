import { describe, expect, it } from 'vitest'
import { POWDER_ID_BY_NAME } from '~/lib/data/powder-constants'
import { powderMarket } from './powder-name'

describe('powderMarket', () => {
  it('maps thunder tier 6 to its market name', () => {
    expect(powderMarket(POWDER_ID_BY_NAME.get('t6')!)).toEqual({ name: 'Thunder Powder', tier: 6 })
  })
  it('maps every element', () => {
    const cases: Record<string, string> = {
      e1: 'Earth Powder',
      t1: 'Thunder Powder',
      w1: 'Water Powder',
      f1: 'Fire Powder',
      a1: 'Air Powder',
    }
    for (const [short, name] of Object.entries(cases))
      expect(powderMarket(POWDER_ID_BY_NAME.get(short)!)).toEqual({ name, tier: 1 })
  })
  it('returns null for an unknown id', () => {
    expect(powderMarket(99999)).toBeNull()
  })
})
