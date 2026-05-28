import { describe, expect, it } from 'vitest'
import {
  allIdentificationKeys,
  humanizeField,
  isInverted,
} from './identifications'

describe('identifications metadata', () => {
  it('humanizes a known id with its unit', () => {
    expect(humanizeField('manaRegen')).toEqual({ label: 'Mana Regen', unit: '/5s' })
  })

  it('humanizes a raw identifications path', () => {
    expect(humanizeField('identifications.spellDamage.raw').label).toBe('Spell Damage')
  })

  it('falls back to title-case for unknown keys', () => {
    expect(humanizeField('someNewStat')).toEqual({ label: 'Some New Stat', unit: '' })
  })

  it('marks cost ids as inverted', () => {
    expect(isInverted('1stSpellCost')).toBe(true)
    expect(isInverted('spellDamage')).toBe(false)
  })

  it('exposes all keys', () => {
    expect(allIdentificationKeys).toContain('manaRegen')
    expect(allIdentificationKeys.length).toBeGreaterThan(50)
  })
})
