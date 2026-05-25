import type { Item } from '../types/item'
import { describe, expect, it } from 'vitest'
import { aggregateItemStats, mergeStat } from './merge-stat'

describe('mergeStat', () => {
  it('adds plain numeric stats', () => {
    const s = new Map<string, unknown>()
    mergeStat(s as never, 'hp', 100)
    mergeStat(s as never, 'hp', 50)
    expect(s.get('hp')).toBe(150)
  })

  it('nests damMult under a sub-map', () => {
    const s = new Map<string, unknown>()
    mergeStat(s as never, 'damMult.Neutral', 10)
    mergeStat(s as never, 'damMult.Neutral', 5)
    const dm = s.get('damMult') as Map<string, number>
    expect(dm.get('Neutral')).toBe(15)
  })

  it('keeps the highest for nonstacking stats', () => {
    const s = new Map<string, unknown>()
    mergeStat(s as never, 'damMult.Potion', 10)
    mergeStat(s as never, 'damMult.Potion', 30)
    mergeStat(s as never, 'damMult.Potion', 20)
    const dm = s.get('damMult') as Map<string, number>
    expect(dm.get('Potion')).toBe(30)
  })

  it('aggregateItemStats sums numeric stats across items', () => {
    const items = [
      { stats: { hp: 100, mr: 5 } },
      { stats: { hp: 50, sdPct: 12 } },
    ] as unknown as Item[]
    const agg = aggregateItemStats(items)
    expect(agg.get('hp')).toBe(150)
    expect(agg.get('mr')).toBe(5)
    expect(agg.get('sdPct')).toBe(12)
  })
})
