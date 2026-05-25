import type { AtreeAbility, AtreeNode, AtreeSelection } from '../types/atree'
// app/lib/atree/merge.test.ts
import { describe, expect, it } from 'vitest'
import { mergeAtree } from './merge'

function ability(over: Partial<AtreeAbility> & { id: number }): AtreeAbility {
  return {
    display_name: `node-${over.id}`,
    desc: '',
    parents: [],
    dependencies: [],
    blockers: [],
    cost: 1,
    ...over,
  }
}

function node(ab: AtreeAbility): AtreeNode {
  return { ability: ab, parents: [], children: [] }
}

describe('mergeAtree', () => {
  it('seeds default abilities for the class', () => {
    const merged = mergeAtree([], new Map(), 'Shaman')
    expect(merged.has(999)).toBe(true)
    expect(merged.has(998)).toBe(true)
    expect(merged.get(999)!.properties.range).toBe(32.25)
  })

  it('adds an active selected node, skips an inactive one', () => {
    const nodes = [
      node(ability({ id: 100, effects: [{ type: 'raw_stat', bonuses: [{ type: 'stat', name: 'mdPct', value: 10 }] }] })),
      node(ability({ id: 101, effects: [] })),
    ]
    const selection: AtreeSelection = new Map([[100, true], [101, false]])
    const merged = mergeAtree(nodes, selection, 'Shaman')
    expect(merged.has(100)).toBe(true)
    expect(merged.has(101)).toBe(false)
  })

  it('merges a base_abil node onto its base: concat effects + sum properties', () => {
    const nodes = [
      node(ability({
        id: 200,
        effects: [{ type: 'raw_stat', bonuses: [{ type: 'stat', name: 'mdPct', value: 5 }] }],
        properties: { foo: 3 } as any,
      })),
      node(ability({
        id: 201,
        base_abil: 200,
        effects: [{ type: 'raw_stat', bonuses: [{ type: 'stat', name: 'sdPct', value: 7 }] }],
        properties: { foo: 4, bar: 1 } as any,
      })),
    ]
    const selection: AtreeSelection = new Map([[200, true], [201, true]])
    const merged = mergeAtree(nodes, selection, 'Shaman')
    const base = merged.get(200)!
    expect(base.effects).toHaveLength(2)
    expect(base.properties.foo).toBe(7) // 3 + 4
    expect(base.properties.bar).toBe(1) // new key added
    expect(merged.has(201)).toBe(false) // merged in, not its own entry
  })

  it('ignores a base_abil node whose base is missing', () => {
    const nodes = [
      node(ability({ id: 300, base_abil: 12345, effects: [{ type: 'raw_stat', bonuses: [] }] })),
    ]
    const merged = mergeAtree(nodes, new Map([[300, true]]), 'Shaman')
    expect(merged.has(300)).toBe(false)
    expect(merged.has(12345)).toBe(false)
  })
})
