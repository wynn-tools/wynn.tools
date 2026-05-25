import type { StatValue } from '../math/merge-stat'
import type { MergedAbility } from './effect-types'
// app/lib/atree/raw-stats.test.ts
import { describe, expect, it } from 'vitest'
import { collectAtreeRawStats } from './raw-stats'

function merged(...abils: MergedAbility[]): Map<number, MergedAbility> {
  const m = new Map<number, MergedAbility>()
  for (const a of abils)
    m.set(a.id, a)
  return m
}

describe('collectAtreeRawStats', () => {
  it('sums stat bonuses across abilities', () => {
    const stats = collectAtreeRawStats(merged(
      { id: 1, properties: {}, effects: [{ type: 'raw_stat', bonuses: [{ type: 'stat', name: 'mdPct', value: 10 }] }] },
      { id: 2, properties: {}, effects: [{ type: 'raw_stat', bonuses: [{ type: 'stat', name: 'mdPct', value: 5 }] }] },
    ))
    expect(stats.get('mdPct')).toBe(15)
  })

  it('skips toggled raw_stat effects', () => {
    const stats = collectAtreeRawStats(merged(
      { id: 1, properties: {}, effects: [{ type: 'raw_stat', toggle: 'some_toggle', bonuses: [{ type: 'stat', name: 'sdPct', value: 99 }] }] },
    ))
    expect(stats.get('sdPct')).toBeUndefined()
  })

  it('skips prop-type bonuses and non-raw_stat effects', () => {
    const stats = collectAtreeRawStats(merged(
      { id: 1, properties: {}, effects: [
        { type: 'raw_stat', bonuses: [{ type: 'prop', name: 'totem_mul', value: 2 }] },
        { type: 'replace_spell', name: 'X' } as any,
      ] },
    ))
    expect(stats.get('totem_mul')).toBeUndefined()
    expect(stats.size).toBe(0)
  })

  it('routes nested multiplier names through mergeStat', () => {
    const stats = collectAtreeRawStats(merged(
      { id: 1, properties: {}, effects: [{ type: 'raw_stat', bonuses: [{ type: 'stat', name: 'damMult.Mask', value: 20 }] }] },
    ))
    const damMult = stats.get('damMult') as Map<string, StatValue>
    expect(damMult).toBeInstanceOf(Map)
    expect(damMult.get('Mask')).toBe(20)
  })
})
