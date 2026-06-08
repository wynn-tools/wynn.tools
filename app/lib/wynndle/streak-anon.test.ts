import type { StreakState } from './streak-anon'
import { describe, expect, it } from 'vitest'
import { applyAnonResult } from './streak-anon'

const ZERO: StreakState = { current: 0, longest: 0, lastSolved: null }

describe('applyAnonResult', () => {
  it('loss leaves longest alone, zeroes current', () => {
    const r = applyAnonResult({ current: 5, longest: 7, lastSolved: '2026-06-07' }, '2026-06-08', false)
    expect(r).toEqual({ current: 0, longest: 7, lastSolved: '2026-06-07' })
  })
  it('first win sets current=1', () => {
    const r = applyAnonResult(ZERO, '2026-06-08', true)
    expect(r).toEqual({ current: 1, longest: 1, lastSolved: '2026-06-08' })
  })
  it('consecutive-day win increments', () => {
    const r = applyAnonResult({ current: 3, longest: 3, lastSolved: '2026-06-07' }, '2026-06-08', true)
    expect(r).toEqual({ current: 4, longest: 4, lastSolved: '2026-06-08' })
  })
  it('non-consecutive win resets to 1', () => {
    const r = applyAnonResult({ current: 3, longest: 7, lastSolved: '2026-06-05' }, '2026-06-08', true)
    expect(r).toEqual({ current: 1, longest: 7, lastSolved: '2026-06-08' })
  })
})
