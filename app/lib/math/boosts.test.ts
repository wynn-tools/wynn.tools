import type { StatMap } from './merge-stat'
import { describe, expect, it } from 'vitest'
import {
  applyBoostMultipliers,
  applyRadiance,
  boostsAreEmpty,
  deserializeBoosts,
  emptyBoosts,
  radianceMultiplier,
  serializeBoosts,
} from './boosts'

function mk(toggles: string[] = [], elemDmg = [0, 0, 0, 0, 0]) {
  return { toggles: new Set(toggles as never[]), elemDmg: elemDmg as [number, number, number, number, number] }
}

describe('radianceMultiplier', () => {
  it('is 1 with no boosts', () => {
    expect(radianceMultiplier(mk())).toBe(1)
  })
  it('adds radiance + divinehonor + shine', () => {
    expect(radianceMultiplier(mk(['radiance', 'divinehonor', 'shine']))).toBeCloseTo(1.25)
  })
  it('judgement forces 1.4 regardless of others', () => {
    expect(radianceMultiplier(mk(['radiance', 'judgement']))).toBe(1.4)
  })
})

describe('applyRadiance', () => {
  it('scales whitelisted positive stats, floored', () => {
    const stats: StatMap = new Map([['sdPct', 10], ['mr', 7]])
    applyRadiance(stats, [0, 0, 0, 0, 0], mk(['radiance']))
    expect(stats.get('sdPct')).toBe(11)
    expect(stats.get('mr')).toBe(8)
  })
  it('does not scale non-whitelisted or negative stats', () => {
    const stats: StatMap = new Map([['sdPct', -10], ['hp', 100]])
    applyRadiance(stats, [0, 0, 0, 0, 0], mk(['radiance']))
    expect(stats.get('sdPct')).toBe(-10)
    expect(stats.get('hp')).toBe(100)
  })
  it('adds item-skillpoint share to skillpoints', () => {
    const stats: StatMap = new Map([['str', 50]])
    applyRadiance(stats, [40, 0, 0, 0, 0], mk(['radiance']))
    expect(stats.get('str')).toBe(56)
  })
  it('no-op when multiplier is 1', () => {
    const stats: StatMap = new Map([['sdPct', 10]])
    applyRadiance(stats, [40, 0, 0, 0, 0], mk())
    expect(stats.get('sdPct')).toBe(10)
    expect(stats.get('str')).toBeUndefined()
  })
})

describe('applyBoostMultipliers', () => {
  function dm(stats: StatMap, key: string) {
    return (stats.get('damMult') as Map<string, number>)?.get(key)
  }
  function df(stats: StatMap, key: string) {
    return (stats.get('defMult') as Map<string, number>)?.get(key)
  }
  it('damage Potion takes the max of vengeful/fortitude', () => {
    const stats: StatMap = new Map()
    applyBoostMultipliers(stats, mk(['vengeful', 'fortitude']))
    expect(dm(stats, 'Potion')).toBe(40)
  })
  it('defense Potion sums warscream + emboldening', () => {
    const stats: StatMap = new Map()
    applyBoostMultipliers(stats, mk(['warscream', 'emboldeningcry']))
    expect(df(stats, 'Potion')).toBe(25)
    expect(dm(stats, 'Strength')).toBe(8)
  })
  it('haunts and judgement', () => {
    const stats: StatMap = new Map()
    applyBoostMultipliers(stats, mk(['fanatic', 'lunatic', 'judgement']))
    expect(dm(stats, 'Vulnerability')).toBe(15)
    expect(df(stats, 'AbilityWeaken')).toBe(15)
    expect(dm(stats, 'Judgement')).toBe(20)
    expect(df(stats, 'Judgement')).toBe(20)
  })
  it('element sliders map to {e}DamPct', () => {
    const stats: StatMap = new Map()
    applyBoostMultipliers(stats, mk([], [10, 0, 0, 5, 0]))
    expect(stats.get('eDamPct')).toBe(10)
    expect(stats.get('fDamPct')).toBe(5)
    expect(stats.get('tDamPct')).toBeUndefined()
  })
})

describe('serialize/deserialize', () => {
  it('round-trips toggles and sliders', () => {
    const b = mk(['radiance', 'fortitude'], [10, 0, 0, 5, 0])
    const { boosts, edmg } = serializeBoosts(b)
    const back = deserializeBoosts(boosts, edmg)
    expect([...back.toggles].sort()).toEqual(['fortitude', 'radiance'])
    expect(back.elemDmg).toEqual([10, 0, 0, 5, 0])
  })
  it('drops empty params and rejects unknown ids', () => {
    expect(serializeBoosts(emptyBoosts())).toEqual({ boosts: null, edmg: null })
    const back = deserializeBoosts('radiance,bogus', null)
    expect([...back.toggles]).toEqual(['radiance'])
    expect(boostsAreEmpty(deserializeBoosts(null, null))).toBe(true)
  })
})
