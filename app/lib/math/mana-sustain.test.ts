import { describe, expect, it } from 'vitest'
import { BASE_MANA_REGEN, computeManaSustain, parseCycle } from './mana-sustain'

const COSTS = { 1: 6, 2: 4, 3: 8, 4: 10 }

describe('parseCycle', () => {
  it('keeps digits 1-4 and drops the rest', () => {
    expect(parseCycle('1234')).toEqual([1, 2, 3, 4])
    expect(parseCycle('1-3-1')).toEqual([1, 3, 1])
    expect(parseCycle('5 0 9a')).toEqual([])
  })
})

describe('computeManaSustain', () => {
  it('computes gain from regen and steal with the base regen offset', () => {
    const r = computeManaSustain({ manaRegen: 75, manaSteal: 9, cps: 8, cycle: [], spellCosts: COSTS })
    // (75 + 25)/5 + 9/3 = 20 + 3 = 23
    expect(r.gainPerSec).toBeCloseTo(23)
    expect(BASE_MANA_REGEN).toBe(25)
  })

  it('does not model usage for a single-spell cycle', () => {
    const r = computeManaSustain({ manaRegen: 0, manaSteal: 0, cps: 9, cycle: [1, 1, 1], spellCosts: COSTS })
    expect(r.hasVariedCycle).toBe(false)
    expect(r.usagePerSec).toBe(0)
    expect(r.netPerSec).toBeCloseTo(r.gainPerSec)
  })

  it('models usage as (cps/3) * mean ramped cycle cost', () => {
    // cycle 1,2 → costs [6,4], mean 5, cps 6 → usage = 2 * 5 = 10
    const r = computeManaSustain({ manaRegen: 0, manaSteal: 0, cps: 6, cycle: [1, 2], spellCosts: COSTS })
    expect(r.hasVariedCycle).toBe(true)
    expect(r.usagePerSec).toBeCloseTo(10)
    // gain = 25/5 = 5 → net = 5 - 10 = -5
    expect(r.netPerSec).toBeCloseTo(-5)
  })

  it('applies the +5 ramp on consecutive repeated spells', () => {
    // cycle 1,1,2 (first≠last, no rotation): costs [6,6], then i=2 is a 1,1
    // repeat so cost(2)=4+5=9 → [6,6,9], mean = 21/3 = 7
    const r = computeManaSustain({ manaRegen: 0, manaSteal: 0, cps: 3, cycle: [1, 1, 2], spellCosts: COSTS })
    expect(r.usagePerSec).toBeCloseTo((3 / 3) * 7)
  })
})
