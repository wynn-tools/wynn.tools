// app/lib/math/build-stats.test.ts
import type { ItemSet } from '../types/item'
import type { ExpandedItem } from './expand-item'
import { describe, expect, it } from 'vitest'
import { aggregateBuildStats, CLASS_DEFENSE_MULTIPLIERS } from './build-stats'
import { computeDefenseStats } from './defense'
import { levelToHPBase } from './skillpoints'

/** Minimal expanded item: maxRolls map + optional static ids / major ids. */
function mkItem(opts: {
  maxRolls?: Record<string, number>
  statics?: Record<string, number>
  majorIds?: string[]
} = {}): ExpandedItem {
  const m = new Map<string, unknown>()
  m.set('maxRolls', new Map(Object.entries(opts.maxRolls ?? {})))
  for (const [k, v] of Object.entries(opts.statics ?? {}))
    m.set(k, v)
  if (opts.majorIds)
    m.set('majorIds', opts.majorIds)
  return m
}

function mkWeapon(type: string, atkSpd = 'NORMAL'): ExpandedItem {
  const m = mkItem()
  m.set('type', type)
  m.set('atkSpd', atkSpd)
  return m
}

const noSets: Map<string, ItemSet> = new Map()

describe('aggregateBuildStats', () => {
  it('initializes base stats from level + weapon', () => {
    const weapon = mkWeapon('relik')
    const stats = aggregateBuildStats([weapon], weapon, 121, new Map(), noSets)
    expect(stats.get('hp')).toBe(levelToHPBase(121))
    expect(stats.get('agiDef')).toBe(90)
    expect(stats.get('poisonPct')).toBe(0)
    expect(stats.get('atkSpd')).toBe('NORMAL')
    expect(stats.get('classDef')).toBe(CLASS_DEFENSE_MULTIPLIERS.get('relik'))
    expect(stats.get('damMult')).toBeInstanceOf(Map)
    expect(stats.get('defMult')).toBeInstanceOf(Map)
    expect(stats.get('healMult')).toBeInstanceOf(Map)
  })

  it('adds maxRolls and static ids from items', () => {
    const weapon = mkWeapon('relik')
    const ring = mkItem({ maxRolls: { sdPct: 12 }, statics: { hp: 500, str: 4 } })
    const stats = aggregateBuildStats([ring, weapon], weapon, 100, new Map(), noSets)
    expect(stats.get('sdPct')).toBe(12)
    expect(stats.get('hp')).toBe(levelToHPBase(100) + 500)
    expect(stats.get('str')).toBe(4)
  })

  it('collects major ids into activeMajorIDs', () => {
    const weapon = mkWeapon('relik')
    const helm = mkItem({ majorIds: ['SATURATED'] })
    const stats = aggregateBuildStats([helm, weapon], weapon, 100, new Map(), noSets)
    const major = stats.get('activeMajorIDs') as Set<string>
    expect(major.has('SATURATED')).toBe(true)
  })

  it('applies set bonuses but skips skillpoint ids', () => {
    const weapon = mkWeapon('relik')
    const sets = new Map<string, ItemSet>([
      ['Demo', { items: ['a', 'b'], bonuses: [{}, { sdPct: 20, str: 5 }] }],
    ])
    const stats = aggregateBuildStats([weapon], weapon, 100, new Map([['Demo', 2]]), sets)
    expect(stats.get('sdPct')).toBe(20) // non-skillpoint bonus applied
    expect(stats.get('str')).toBe(0) // skillpoint bonus skipped
  })

  it('produces a statMap consumable by computeDefenseStats', () => {
    const weapon = mkWeapon('relik')
    const chest = mkItem({ statics: { hp: 1000, def: 50 } })
    const stats = aggregateBuildStats([chest, weapon], weapon, 121, new Map(), noSets)
    const def = computeDefenseStats(stats)
    expect(def.totalHp).toBe(levelToHPBase(121) + 1000)
    expect(def.ehp.withoutAgi).toBeGreaterThan(def.totalHp)
  })
})
