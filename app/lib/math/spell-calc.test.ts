import type { StatMap } from './merge-stat'
// app/lib/math/spell-calc.test.ts
import { describe, expect, it } from 'vitest'
import { computeSpellParts } from './spell-calc'
import { DEFAULT_SPELLS } from './spells'

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

describe('computeSpellParts', () => {
  it('relik melee: Single Beam is 33% of the weapon, Total is 3 beams', () => {
    const spell = DEFAULT_SPELLS.get('relik')!
    const parts = computeSpellParts(spell, new Map() as StatMap, neutralWeapon())
    expect(parts).toHaveLength(2)

    const beam = parts[0]!
    expect(beam.name).toBe('Single Beam')
    expect(beam.normalTotal[0]).toBeCloseTo(33, 5)
    expect(beam.normalTotal[1]).toBeCloseTo(52.8, 5)
    expect(beam.critTotal[0]).toBeCloseTo(66, 5)
    expect(beam.critTotal[1]).toBeCloseTo(105.6, 5)

    const total = parts[1]!
    expect(total.name).toBe('Total')
    expect(total.normalTotal[0]).toBeCloseTo(99, 5)
    expect(total.normalTotal[1]).toBeCloseTo(158.4, 5)
    expect(total.critTotal[0]).toBeCloseTo(198, 5)
    expect(total.critTotal[1]).toBeCloseTo(316.8, 5)
  })

  it('wand melee: single Melee part is 100% of the weapon', () => {
    const spell = DEFAULT_SPELLS.get('wand')!
    const parts = computeSpellParts(spell, new Map(), neutralWeapon())
    expect(parts).toHaveLength(1)
    expect(parts[0]!.name).toBe('Melee')
    expect(parts[0]!.normalTotal[0]).toBeCloseTo(100, 5)
    expect(parts[0]!.normalTotal[1]).toBeCloseTo(160, 5)
  })

  it('throws on an unsupported (heal) part', () => {
    const spell = {
      name: 'Test',
      baseSpell: 1,
      parts: [{ name: 'Heal', power: 0.5 } as any],
    }
    expect(() => computeSpellParts(spell as any, new Map(), neutralWeapon())).toThrow(/heal/i)
  })
})
