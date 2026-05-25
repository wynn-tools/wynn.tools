import { describe, expect, it } from 'vitest'
import { SYNTHETIC_ENC } from './__fixtures__/synthetic-enc'
import { bitlen, flags, mod, num } from './codec-util'

describe('codec-util', () => {
  it('mod is non-negative', () => {
    expect(mod(-1, 5)).toBe(4)
    expect(mod(7, 5)).toBe(2)
  })

  it('reads constants', () => {
    expect(num(SYNTHETIC_ENC, 'ITEM_ID_BITLEN')).toBe(13)
    expect(flags(SYNTHETIC_ENC, 'EQUIPMENT_KIND').NORMAL).toBe(0)
    expect(bitlen(SYNTHETIC_ENC, 'EQUIPMENT_KIND')).toBe(2)
  })
})
