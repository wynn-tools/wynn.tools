import { describe, expect, it } from 'vitest'
import { POWDER_ID_BY_NAME, POWDER_NAME_BY_ID, POWDER_TIERS, SKP_ELEMENTS } from './powder-constants'

describe('powder constants', () => {
  it('has 5 elements in encoding order and 7 tiers', () => {
    expect(SKP_ELEMENTS).toEqual(['e', 't', 'w', 'f', 'a'])
    expect(POWDER_TIERS).toBe(7)
  })

  it('assigns element-major sequential ids', () => {
    expect(POWDER_ID_BY_NAME.get('e1')).toBe(0)
    expect(POWDER_ID_BY_NAME.get('e7')).toBe(6)
    expect(POWDER_ID_BY_NAME.get('t1')).toBe(7)
    expect(POWDER_ID_BY_NAME.get('a7')).toBe(34)
  })

  it('has exactly 35 powders', () => {
    expect(POWDER_ID_BY_NAME.size).toBe(35)
    expect(POWDER_NAME_BY_ID.size).toBe(35)
  })

  it('name<->id maps are exact inverses', () => {
    for (const [name, id] of POWDER_ID_BY_NAME)
      expect(POWDER_NAME_BY_ID.get(id)).toBe(name)
  })
})
