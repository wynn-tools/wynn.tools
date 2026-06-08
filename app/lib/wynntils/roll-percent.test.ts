import { describe, expect, it } from 'vitest'
import { overallRollPercent, rollColorVar, rollPercent } from './roll-percent'

describe('rollPercent', () => {
  it('returns 100 at max of positive range', () => {
    expect(rollPercent(100, { min: 30, max: 100, raw: 100 })).toBe(100)
  })
  it('returns 0 at min of positive range', () => {
    expect(rollPercent(30, { min: 30, max: 100, raw: 100 })).toBe(0)
  })
  it('interpolates linearly inside a positive range', () => {
    expect(rollPercent(65, { min: 30, max: 100, raw: 100 })).toBeCloseTo(50, 5)
  })
  it('clamps above 100', () => {
    expect(rollPercent(120, { min: 30, max: 100, raw: 100 })).toBe(100)
  })
  it('clamps below 0', () => {
    expect(rollPercent(10, { min: 30, max: 100, raw: 100 })).toBe(0)
  })
  it('treats purely-negative ranges as "closer to lo = higher %"', () => {
    // E.g. Heal Cost: range raw=-4, min/max stored as -2/-6 in shorthand (lo=-6, hi=-2)
    // actual -4 sits at 50% between -6 and -2
    expect(rollPercent(-4, { min: -2, max: -6, raw: -4 })).toBeCloseTo(50, 5)
    // actual -6 (lo) = 0% (worst end of range)
    expect(rollPercent(-6, { min: -2, max: -6, raw: -4 })).toBe(0)
    // actual -2 (hi) = 100%
    expect(rollPercent(-2, { min: -2, max: -6, raw: -4 })).toBe(100)
  })
  it('returns null for fixed-value range', () => {
    expect(rollPercent(50, { min: 50, max: 50, raw: 50 })).toBeNull()
  })
})

describe('overallRollPercent', () => {
  it('averages non-null per-stat percentages', () => {
    expect(overallRollPercent([80, 60, 100])).toBeCloseTo(80, 5)
  })
  it('ignores nulls', () => {
    expect(overallRollPercent([80, null, 100])).toBeCloseTo(90, 5)
  })
  it('returns null when nothing contributes', () => {
    expect(overallRollPercent([null, null])).toBeNull()
    expect(overallRollPercent([])).toBeNull()
  })
})

describe('rollColorVar', () => {
  it('< 20 → red', () => {
    expect(rollColorVar(0)).toBe('--inspect-roll-red')
    expect(rollColorVar(19.9)).toBe('--inspect-roll-red')
  })
  it('20–<50 → gold', () => {
    expect(rollColorVar(20)).toBe('--inspect-roll-gold')
    expect(rollColorVar(49.9)).toBe('--inspect-roll-gold')
  })
  it('50–<80 → yellow', () => {
    expect(rollColorVar(50)).toBe('--inspect-roll-yellow')
    expect(rollColorVar(79.9)).toBe('--inspect-roll-yellow')
  })
  it('80–<100 → green', () => {
    expect(rollColorVar(80)).toBe('--inspect-roll-green')
    expect(rollColorVar(99.9)).toBe('--inspect-roll-green')
  })
  it('100 → aqua', () => {
    expect(rollColorVar(100)).toBe('--inspect-roll-aqua')
  })
})
