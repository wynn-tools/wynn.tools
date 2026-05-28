import { describe, expect, it } from 'vitest'
import { attackSpeedLabel, baseStatMeta, formatIdValue, idIsGood } from './tooltip'

describe('tooltip helpers', () => {
  it('labels attack speeds', () => {
    expect(attackSpeedLabel('superSlow')).toBe('Super Slow')
    expect(attackSpeedLabel('normal')).toBe('Normal')
    expect(attackSpeedLabel('mystery')).toBe('Mystery')
  })

  it('maps base-stat keys to labels + element icons', () => {
    expect(baseStatMeta('damage')).toEqual({ label: 'Neutral Damage', element: 'neutral' })
    expect(baseStatMeta('waterDamage')).toEqual({ label: 'Water Damage', element: 'water' })
    expect(baseStatMeta('earthDefence')).toEqual({ label: 'Earth Defence', element: 'earth' })
    expect(baseStatMeta('health')).toEqual({ label: 'Health', element: null })
  })

  it('formats id values keeping negative signs only', () => {
    expect(formatIdValue(26, '')).toBe('26')
    expect(formatIdValue(13, '/5s')).toBe('13/5s')
    expect(formatIdValue(-65, '')).toBe('-65')
    expect(formatIdValue(39, '%')).toBe('39%')
  })

  it('decides good/bad with inversion', () => {
    expect(idIsGood(10, false)).toBe(true)
    expect(idIsGood(-10, false)).toBe(false)
    expect(idIsGood(-65, true)).toBe(true)
    expect(idIsGood(5, true)).toBe(false)
  })
})
