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
  it('radiance alone is 1.15', () => {
    expect(radianceMultiplier(mk(['radiance']))).toBeCloseTo(1.15)
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
  it('scales raw + elemental damage stats from the full whitelist', () => {
    const stats: StatMap = new Map([['sdRaw', 100], ['eDamPct', 20], ['critDamPct', 30]])
    applyRadiance(stats, [0, 0, 0, 0, 0], mk(['radiance'])) // 1.15
    // Floored like WynnBuilder's Math.floor(stat * boost); 100*1.15 is
    // 114.999… in IEEE-754 → 114, matching the reference exactly.
    expect(stats.get('sdRaw')).toBe(114)
    expect(stats.get('eDamPct')).toBe(23)
    expect(stats.get('critDamPct')).toBe(34)
  })
  it('scales reversed-id spell-cost stats on the negative branch only', () => {
    const stats: StatMap = new Map([['spRaw1', -10], ['spRaw2', 10]])
    applyRadiance(stats, [0, 0, 0, 0, 0], mk(['judgement'])) // 1.4
    expect(stats.get('spRaw1')).toBe(-14) // floor(-10*1.4)=-14 (more cost reduction)
    expect(stats.get('spRaw2')).toBe(10) // positive reversed-id untouched
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
  it('vengeful alone gives damage Potion 20', () => {
    const stats: StatMap = new Map()
    applyBoostMultipliers(stats, mk(['vengeful']))
    expect(dm(stats, 'Potion')).toBe(20)
  })
  it('warscream alone gives defense Potion 20', () => {
    const stats: StatMap = new Map()
    applyBoostMultipliers(stats, mk(['warscream']))
    expect(df(stats, 'Potion')).toBe(20)
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
