import type { StatMap } from './merge-stat'
import { describe, expect, it } from 'vitest'
import { computeDefenseStats } from './defense'
import { rawToPct, rawToPctUncapped } from './raw-to-pct'

describe('rawToPct', () => {
  it('caps negative raw at 0', () => {
    expect(rawToPct(-100, 0.5)).toBe(-50)
    expect(rawToPct(-100, 2)).toBe(0)
    expect(rawToPct(100, 0.5)).toBe(150)
    expect(rawToPct(0, 1)).toBe(0)
  })
  it('uncapped can flip sign', () => {
    expect(rawToPctUncapped(-100, 2)).toBe(100)
    expect(rawToPctUncapped(100, 0.5)).toBe(150)
  })
})

function baseStats(overrides: Record<string, number> = {}): StatMap {
  const m: StatMap = new Map()
  const defaults: Record<string, number> = {
    hp: 1000,
    hpBonus: 0,
    def: 0,
    agi: 0,
    classDef: 1,
    agiDef: 0,
    hprRaw: 100,
    hprPct: 0,
    rDefPct: 0,
    eDef: 0,
    tDef: 0,
    wDef: 0,
    fDef: 0,
    aDef: 0,
    eDefPct: 0,
    tDefPct: 0,
    wDefPct: 0,
    fDefPct: 0,
    aDefPct: 0,
    ...overrides,
  }
  for (const [k, v] of Object.entries(defaults))
    m.set(k, v)
  m.set('defMult', new Map())
  return m
}

describe('computeDefenseStats', () => {
  it('baseline: no def/agi, classDef 1, empty defMult', () => {
    const d = computeDefenseStats(baseStats())
    expect(d.totalHp).toBe(1000)
    expect(d.ehp.withAgi).toBeCloseTo(1000, 6)
    expect(d.ehp.withoutAgi).toBeCloseTo(1000, 6)
    expect(d.totalHpr).toBe(100)
    expect(d.defPct).toBe(0)
    expect(d.agiPct).toBe(0)
    expect(d.elementalDefenses).toEqual([0, 0, 0, 0, 0])
  })

  it('clamps totalHp to >= 5', () => {
    expect(computeDefenseStats(baseStats({ hp: 1, hpBonus: 0 })).totalHp).toBe(5)
  })

  it('applies a defMult entry', () => {
    const s = baseStats({ hp: 1000 })
    ;(s.get('defMult') as Map<string, number>).set('Neutral', 50)
    const d = computeDefenseStats(s)
    expect(d.ehp.withoutAgi).toBeCloseTo(2000, 6)
  })

  it('elemental defenses use rawToPctUncapped', () => {
    const d = computeDefenseStats(baseStats({ eDef: 100, eDefPct: 50 }))
    expect(d.elementalDefenses[0]).toBeCloseTo(150, 6)
  })
})
