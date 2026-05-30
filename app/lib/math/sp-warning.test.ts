import type { SkillpointResult } from './skillpoint-calc'
import { describe, expect, it } from 'vitest'
import { computeSpWarning } from './sp-warning'

function mkResult(over: Partial<SkillpointResult> & { baseSkillpoints: number[], assignedTotal: number }): SkillpointResult {
  return {
    equipOrder: [],
    finalSkillpoints: [0, 0, 0, 0, 0],
    activeSetCounts: new Map(),
    totalItemSkillpoints: [0, 0, 0, 0, 0],
    ...over,
  }
}

describe('computeSpWarning', () => {
  it('returns ok when feasible and no tome dependency', () => {
    const skp = mkResult({ baseSkillpoints: [40, 0, 0, 0, 0], assignedTotal: 40 })
    const w = computeSpWarning(skp, null, 200)
    expect(w.status).toBe('ok')
    expect(w.message).toBe('')
    expect(w.remaining).toBe(160)
  })

  it('flags insufficient when required exceeds available', () => {
    const skp = mkResult({ baseSkillpoints: [80, 80, 50, 0, 0], assignedTotal: 210 })
    const w = computeSpWarning(skp, null, 200)
    expect(w.status).toBe('insufficient')
    expect(w.remaining).toBe(-10)
    expect(w.message).toContain('10 skill points short')
  })

  it('flags over-cap when a single skill needs more than 100', () => {
    const skp = mkResult({ baseSkillpoints: [120, 0, 0, 0, 0], assignedTotal: 120 })
    const w = computeSpWarning(skp, null, 400)
    expect(w.status).toBe('over-cap')
    expect(w.overCapSkills).toEqual([0])
    expect(w.message).toContain('Strength')
  })

  it('over-cap takes priority over insufficient', () => {
    const skp = mkResult({ baseSkillpoints: [130, 90, 0, 0, 0], assignedTotal: 220 })
    const w = computeSpWarning(skp, null, 200)
    expect(w.status).toBe('over-cap')
  })

  it('flags needs-tomes when wearable only with the guild tome', () => {
    // With guild tome: feasible (190 ≤ 200). Without: 205 > 200 → infeasible.
    const withTome = mkResult({ baseSkillpoints: [90, 100, 0, 0, 0], assignedTotal: 190 })
    const withoutTome = mkResult({ baseSkillpoints: [95, 110, 0, 0, 0], assignedTotal: 205 })
    const w = computeSpWarning(withTome, withoutTome, 200, [5, 10, 0, 0, 0])
    expect(w.status).toBe('needs-tomes')
    expect(w.message).toContain('Guild Tome')
    expect(w.detail).toContain('+5 Strength')
    expect(w.detail).toContain('+10 Dexterity')
    expect(w.detail).toContain('5 skill points short')
  })

  it('stays ok when guild tome is equipped but not required', () => {
    const withTome = mkResult({ baseSkillpoints: [40, 0, 0, 0, 0], assignedTotal: 40 })
    const withoutTome = mkResult({ baseSkillpoints: [45, 0, 0, 0, 0], assignedTotal: 45 })
    const w = computeSpWarning(withTome, withoutTome, 200, [5, 0, 0, 0, 0])
    expect(w.status).toBe('ok')
  })
})
