import type { MergedAbility } from './effect-types'
import { describe, expect, it } from 'vitest'
import { collectAtreeStatScaling } from './stat-scaling'

function ability(id: number, effects: MergedAbility['effects'], properties: Record<string, number> = {}): MergedAbility {
  return { id, effects, properties }
}

describe('collectAtreeStatScaling', () => {
  it('scales a stat input into a stat output, capped at max (Seance)', () => {
    const merged = new Map<number, MergedAbility>([
      [38, ability(38, [
        { type: 'stat_scaling', slider: false, scaling: [0.2], max: 50, inputs: [{ type: 'stat', name: 'ls' }], output: { type: 'stat', name: 'sdPct' } } as never,
      ])],
    ])
    const pre = new Map<string, number>([['ls', 914]]) // 914 * 0.2 = 182.8 -> capped 50
    const out = collectAtreeStatScaling(merged, pre)
    expect(out.get('sdPct')).toBe(50)
  })

  it('floors the total below the cap', () => {
    const merged = new Map<number, MergedAbility>([
      [1, ability(1, [
        { type: 'stat_scaling', scaling: [0.2], max: 50, inputs: [{ type: 'stat', name: 'ls' }], output: { type: 'stat', name: 'sdPct' } } as never,
      ])],
    ])
    const out = collectAtreeStatScaling(merged, new Map([['ls', 123]])) // 123*0.2 = 24.6 -> floor 24
    expect(out.get('sdPct')).toBe(24)
  })

  it('sums multiple inputs with per-input scaling (Wisdom)', () => {
    const merged = new Map<number, MergedAbility>([
      [6, ability(6, [
        { type: 'stat_scaling', scaling: [0.5, 0.5], max: 5, inputs: [{ type: 'stat', name: 'sdPct' }, { type: 'stat', name: 'sdRaw' }], output: { type: 'stat', name: 'mr' } } as never,
      ])],
    ])
    const out = collectAtreeStatScaling(merged, new Map([['sdPct', 4], ['sdRaw', 2]])) // 2 + 1 = 3
    expect(out.get('mr')).toBe(3)
  })

  it('clamps negative totals to 0 when positive (default)', () => {
    const merged = new Map<number, MergedAbility>([
      [1, ability(1, [
        { type: 'stat_scaling', scaling: [1], inputs: [{ type: 'stat', name: 'x' }], output: { type: 'stat', name: 'y' } } as never,
      ])],
    ])
    const out = collectAtreeStatScaling(merged, new Map([['x', -10]]))
    expect(out.get('y') ?? 0).toBe(0)
  })

  it('writes prop outputs back onto the target ability', () => {
    const merged = new Map<number, MergedAbility>([
      [9, ability(9, [
        { type: 'stat_scaling', scaling: [2], inputs: [{ type: 'prop', abil: 9, name: 'base' }], output: { type: 'prop', abil: 9, name: 'derived' } } as never,
      ], { base: 5 })],
    ])
    collectAtreeStatScaling(merged, new Map())
    expect(merged.get(9)!.properties.derived).toBe(10)
  })

  it('ignores slider-driven effects (no interactive value)', () => {
    const merged = new Map<number, MergedAbility>([
      [20, ability(20, [
        { type: 'stat_scaling', slider: true, slider_name: 'Distortion', scaling: [1], output: { type: 'stat', name: 'damRaw' } } as never,
      ])],
    ])
    const out = collectAtreeStatScaling(merged, new Map())
    expect(out.get('damRaw')).toBeUndefined()
  })
})
