import type { StatMap } from './merge-stat'
import { describe, expect, it } from 'vitest'
import {
  applyPowderSpecialBoosts,
  collectPowderSpecialAttacks,
  deserializePowderActive,
  emptyPowderActive,
  POWDER_SPECIALS,
  powderActiveIsEmpty,
  serializePowderActive,
  tierReadout,
} from './powder-specials'

function dm(stats: StatMap, key: string) {
  return (stats.get('damMult') as Map<string, number>)?.get(key)
}

describe('pOWDER_SPECIALS table', () => {
  it('has five specials in element order e,t,w,f,a', () => {
    expect(POWDER_SPECIALS.map(s => s.weaponName)).toEqual([
      'Quake',
      'Chain Lightning',
      'Curse',
      'Courage',
      'Wind Prison',
    ])
    expect(POWDER_SPECIALS.map(s => s.cap)).toEqual([
      300,
      200,
      120,
      120,
      120,
    ])
    expect(POWDER_SPECIALS.map(s => s.passiveName)).toEqual([
      'Rage',
      'Kill Streak',
      'Concentration',
      'Endurance',
      'Dodge',
    ])
  })
  it('carries 7-entry effect arrays', () => {
    expect(POWDER_SPECIALS[0]!.damage).toEqual([
      240,
      280,
      320,
      360,
      400,
      440,
      480,
    ])
    expect(POWDER_SPECIALS[4]!.damageBoost).toEqual([
      100,
      125,
      150,
      175,
      200,
      225,
      250,
    ])
    expect(POWDER_SPECIALS[2]!.damage).toBeUndefined() // Curse has no direct damage
  })
})

describe('applyPowderSpecialBoosts', () => {
  it('sets damMult for damage-boost specials at the chosen tier', () => {
    const stats: StatMap = new Map()
    // tiers per element [Quake, Chain, Curse(t7=25), Courage(t5=20), WindPrison(t6=225)]
    applyPowderSpecialBoosts(stats, [0, 0, 7, 5, 6])
    expect(dm(stats, 'Curse')).toBe(25)
    expect(dm(stats, 'Courage')).toBe(20)
    expect(dm(stats, 'Wind Prison')).toBe(225)
  })
  it('is a no-op for Quake/Chain Lightning and tier 0', () => {
    const stats: StatMap = new Map()
    applyPowderSpecialBoosts(stats, [6, 6, 0, 0, 0])
    expect(stats.get('damMult')).toBeUndefined()
  })
})

describe('tierReadout', () => {
  it('describes direct-damage specials', () => {
    expect(tierReadout(0, 6)).toBe('440% area damage') // Quake tier 6
  })
  it('describes damage-boost specials', () => {
    expect(tierReadout(2, 7)).toBe('+25% damage') // Curse tier 7
  })
  it('is empty at tier 0', () => {
    expect(tierReadout(0, 0)).toBe('')
  })
})

describe('serialize/deserialize active tiers', () => {
  it('round-trips and clamps', () => {
    expect(serializePowderActive([0, 0, 6, 0, 0])).toBe('0.0.6.0.0')
    expect(deserializePowderActive('0.0.6.0.0')).toEqual([0, 0, 6, 0, 0])
    expect(deserializePowderActive('9.-1.x.0.0')).toEqual([7, 0, 0, 0, 0]) // clamp/parse
  })
  it('empty handling', () => {
    expect(serializePowderActive(emptyPowderActive())).toBeNull()
    expect(powderActiveIsEmpty(deserializePowderActive(null))).toBe(true)
  })
})

describe('collectPowderSpecialAttacks', () => {
  function weaponMap() {
    return new Map<string, unknown>([
      ['type', 'relik'],
      ['atkSpd', 'NORMAL'],
      ['nDam_', [0, 0]],
      ['eDam_', [50, 70]],
      ['tDam_', [0, 0]],
      ['wDam_', [0, 0]],
      ['fDam_', [0, 0]],
      ['aDam_', [0, 0]],
      ['damagePresent', [false, true, false, false, false, false]],
    ])
  }
  function baseStats(): StatMap {
    return new Map<string, unknown>([
      ['str', 0],
      ['dex', 0],
      ['int', 0],
      ['def', 0],
      ['agi', 0],
    ]) as StatMap
  }
  it('emits one synthetic attack per active direct-damage special', () => {
    const attacks = collectPowderSpecialAttacks(
      [6, 0, 0, 0, 0],
      baseStats(),
      weaponMap(),
    )
    expect(attacks).toHaveLength(1) // Quake only
    expect(attacks[0]!.spell.name).toContain('Quake')
    expect(attacks[0]!.parts.length).toBeGreaterThan(0)
  })
  it('skips boost-only specials and tier 0', () => {
    expect(
      collectPowderSpecialAttacks([0, 0, 7, 0, 6], baseStats(), weaponMap()),
    ).toHaveLength(0)
  })
})
