// app/lib/math/skillpoint-calc.test.ts
import type { ItemSet } from '../types/item'
import type { ExpandedItem } from './expand-item'
import { describe, expect, it } from 'vitest'
import { calculateSkillpoints } from './skillpoint-calc'

/** Build a minimal expanded-item statMap for skillpoint tests. */
function mkItem(opts: {
  reqs?: number[]
  skillpoints?: number[]
  set?: string | null
  category?: string
  none?: boolean
} = {}): ExpandedItem {
  const m = new Map<string, unknown>()
  m.set('reqs', opts.reqs ?? [0, 0, 0, 0, 0])
  m.set('skillpoints', opts.skillpoints ?? [0, 0, 0, 0, 0])
  m.set('set', opts.set ?? null)
  m.set('category', opts.category ?? 'armor')
  if (opts.none)
    m.set('NONE', true)
  return m
}

const noneNine = (): ExpandedItem[] => Array.from({ length: 9 }, () => mkItem({ none: true }))
const noWeapon = mkItem({ category: 'weapon' })
const noSets: Map<string, ItemSet> = new Map()

describe('calculateSkillpoints', () => {
  it('baseline: nine NONE items + zero weapon → all zero', () => {
    const r = calculateSkillpoints(noneNine(), noWeapon, noSets)
    expect(r.baseSkillpoints).toEqual([0, 0, 0, 0, 0])
    expect(r.finalSkillpoints).toEqual([0, 0, 0, 0, 0])
    expect(r.assignedTotal).toBe(0)
    expect(r.activeSetCounts.size).toBe(0)
    expect(r.equipOrder).toHaveLength(9)
  })

  it('a single dex-30 requirement forces 30 assigned to dex', () => {
    const items = noneNine()
    items[0] = mkItem({ reqs: [0, 30, 0, 0, 0] })
    const r = calculateSkillpoints(items, noWeapon, noSets)
    expect(r.finalSkillpoints[1]).toBe(30)
    expect(r.assignedTotal).toBe(30)
  })

  it('an item granting +str lowers points needed for a later str requirement', () => {
    // Item A grants +10 str; Item B requires 10 str. Equipping A first means B is free.
    const items = noneNine()
    items[0] = mkItem({ skillpoints: [10, 0, 0, 0, 0] }) // grants +10 str
    items[1] = mkItem({ reqs: [10, 0, 0, 0, 0] }) // needs 10 str
    const r = calculateSkillpoints(items, noWeapon, noSets)
    expect(r.assignedTotal).toBe(0)
    expect(r.baseSkillpoints).toEqual([0, 0, 0, 0, 0])
  })

  it('skillpoint-granting set bonus is folded into final + total item skillpoints', () => {
    const sets = new Map<string, ItemSet>([
      ['Demo', { items: ['a', 'b'], bonuses: [{}, { str: 5 }] }],
    ])
    const items = noneNine()
    items[0] = mkItem({ set: 'Demo' })
    items[1] = mkItem({ set: 'Demo' })
    const r = calculateSkillpoints(items, noWeapon, sets)
    expect(r.activeSetCounts.get('Demo')).toBe(2)
    // bonuses[2-1] = { str: 5 } → str final/total bumped by 5
    expect(r.finalSkillpoints[0]).toBe(5)
    expect(r.totalItemSkillpoints[0]).toBe(5)
  })
})
