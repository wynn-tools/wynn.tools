import type { StatMap } from './merge-stat'
import { describe, expect, it } from 'vitest'
import { calculateSpellDamage } from './spell-damage'

function neutralWeapon(): Map<string, unknown> {
  const w = new Map<string, unknown>()
  w.set('tier', 'Legendary')
  w.set('atkSpd', 'NORMAL')
  w.set('nDam_', [100, 160])
  for (const k of ['eDam_', 'tDam_', 'wDam_', 'fDam_', 'aDam_'])
    w.set(k, [0, 0])
  w.set('damagePresent', [true, false, false, false, false, false])
  return w
}

describe('calculateSpellDamage', () => {
  it('baseline: pure neutral, zero stats, melee, ignore speed', () => {
    const res = calculateSpellDamage(new Map() as StatMap, neutralWeapon(), [100, 0, 0, 0, 0, 0], false, { ignoreSpeed: true })
    expect(res.normalTotal[0]).toBeCloseTo(100, 6)
    expect(res.normalTotal[1]).toBeCloseTo(160, 6)
    expect(res.critTotal[0]).toBeCloseTo(200, 6)
    expect(res.critTotal[1]).toBeCloseTo(320, 6)
  })

  it('returns 6 per-element rows of length 4 and crit >= normal', () => {
    const res = calculateSpellDamage(new Map(), neutralWeapon(), [100, 0, 0, 0, 0, 0], false, { ignoreSpeed: true })
    expect(res.perElement).toHaveLength(6)
    for (const row of res.perElement)
      expect(row).toHaveLength(4)
    expect(res.critTotal[0]).toBeGreaterThanOrEqual(res.normalTotal[0])
    expect(res.critTotal[1]).toBeGreaterThanOrEqual(res.normalTotal[1])
  })

  it('a flat damage % boost scales normal damage', () => {
    const stats: StatMap = new Map([['damPct', 100]])
    const res = calculateSpellDamage(stats, neutralWeapon(), [100, 0, 0, 0, 0, 0], false, { ignoreSpeed: true })
    expect(res.normalTotal[1]).toBeCloseTo(320, 6)
  })
})
