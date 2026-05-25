import type { StatMap } from './merge-stat'
// app/lib/math/dps.test.ts
import { describe, expect, it } from 'vitest'
import { ATTACK_SPEEDS } from './constants'
import { computeMeleeDps, critChance, partAverageDamage } from './dps'
import { computeSpellParts } from './spell-calc'
import { DEFAULT_SPELLS } from './spells'

function neutralWeapon(): Map<string, unknown> {
  const w = new Map<string, unknown>()
  w.set('atkSpd', 'NORMAL')
  w.set('nDam_', [100, 160])
  for (const k of ['eDam_', 'tDam_', 'wDam_', 'fDam_', 'aDam_'])
    w.set(k, [0, 0])
  w.set('damagePresent', [true, false, false, false, false, false])
  return w
}

/** Build a stats map mirroring what aggregateBuildStats would produce for DPS. */
function statsWith(over: Record<string, number> = {}): StatMap {
  const s = new Map<string, unknown>() as StatMap
  s.set('atkSpd', 'NORMAL')
  s.set('atkTier', 0)
  s.set('dex', 0)
  for (const [k, v] of Object.entries(over))
    s.set(k, v)
  return s
}

describe('dps assembly', () => {
  it('partAverageDamage with zero crit is the non-crit average', () => {
    const part = { normalTotal: [99, 158.4], critTotal: [198, 316.8] } as any
    expect(partAverageDamage(part, 0)).toBeCloseTo(128.7, 5)
  })

  it('relik melee per-attack + average DPS at NORMAL speed, zero stats', () => {
    const spell = DEFAULT_SPELLS.get('relik')!
    const stats = statsWith()
    const parts = computeSpellParts(spell, stats, neutralWeapon())
    const dps = computeMeleeDps(spell, parts, stats)
    expect(dps.perAttack).toBeCloseTo(128.7, 4)
    expect(dps.averageDps).toBeCloseTo(263.835, 3) // 128.7 * 2.05
    expect(dps.attackSpeed).toBe('NORMAL')
  })

  it('atkTier pushes the adjusted attack speed up to SUPER_FAST', () => {
    const spell = DEFAULT_SPELLS.get('relik')!
    const stats = statsWith({ atkTier: 3 })
    const parts = computeSpellParts(spell, stats, neutralWeapon())
    const dps = computeMeleeDps(spell, parts, stats)
    expect(dps.attackSpeed).toBe('SUPER_FAST')
    expect(dps.averageDps).toBeCloseTo(553.41, 2) // 128.7 * 4.3
  })

  it('higher dex increases per-attack via crit weighting', () => {
    const spell = DEFAULT_SPELLS.get('relik')!
    const weapon = neutralWeapon()
    const low = computeMeleeDps(spell, computeSpellParts(spell, statsWith(), weapon), statsWith())
    const high = computeMeleeDps(spell, computeSpellParts(spell, statsWith({ dex: 100 }), weapon), statsWith({ dex: 100 }))
    expect(high.perAttack).toBeGreaterThan(low.perAttack)
  })

  it('critChance reads dex', () => {
    expect(critChance(statsWith({ dex: 0 }))).toBe(0)
    expect(critChance(statsWith({ dex: 100 }))).toBeGreaterThan(0)
  })

  it('aTTACK_SPEEDS sanity', () => {
    expect(ATTACK_SPEEDS.indexOf('NORMAL')).toBe(3)
  })
})
