import type { SearchItem } from './types'
import { describe, expect, it } from 'vitest'
import { STAT_SUM_PRESETS, sumPreset } from './stat-sums'

function item(ids: Record<string, { min: number, max: number, raw: number }>): SearchItem {
  return { identifications: ids, base: {} } as unknown as SearchItem
}

describe('stat sum presets', () => {
  it('spSum aggregates the five core skillpoints (v3 names)', () => {
    expect(STAT_SUM_PRESETS.spSum.members).toEqual([
      'rawStrength',
      'rawDexterity',
      'rawIntelligence',
      'rawDefence',
      'rawAgility',
    ])
  })
  it('elemDmgTotal aggregates the five element damage %s', () => {
    expect(STAT_SUM_PRESETS.elemDmgTotal.members).toEqual([
      'earthDamage',
      'thunderDamage',
      'waterDamage',
      'fireDamage',
      'airDamage',
    ])
  })
})

describe('sumPreset', () => {
  it('treats missing IDs as 0', () => {
    const i = item({ rawStrength: { min: 1, max: 5, raw: 3 } })
    expect(sumPreset(i, 'spSum', 'possible')).toBe(5)
  })
  it('sums favored values across all members at possible basis', () => {
    const i = item({
      rawStrength: { min: 1, max: 5, raw: 3 },
      rawDexterity: { min: 2, max: 7, raw: 4 },
    })
    expect(sumPreset(i, 'spSum', 'possible')).toBe(12)
  })
  it('sums min-roll at guaranteed basis', () => {
    const i = item({
      rawStrength: { min: 1, max: 5, raw: 3 },
      rawDexterity: { min: 2, max: 7, raw: 4 },
    })
    expect(sumPreset(i, 'spSum', 'guaranteed')).toBe(3)
  })
})
