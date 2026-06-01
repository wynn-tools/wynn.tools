// app/lib/build/roll-context.test.ts
import { describe, expect, it } from 'vitest'
import { computeAppliedRolls, DEFAULT_ROLL_CONTEXT } from './roll-context'

const minRolls = new Map([
  ['sdPct', 3],
  ['hpBonus', 30],
])
const maxRolls = new Map([
  ['sdPct', 13],
  ['hpBonus', 130],
])

describe('computeAppliedRolls', () => {
  it('defaults to maxRolls when preset=max and no overrides', () => {
    expect(computeAppliedRolls(minRolls, maxRolls, 'max', undefined)).toEqual(
      maxRolls,
    )
  })

  it('returns minRolls when preset=min', () => {
    expect(computeAppliedRolls(minRolls, maxRolls, 'min', undefined)).toEqual(
      minRolls,
    )
  })

  it('returns midpoint when preset=avg (idRound)', () => {
    const applied = computeAppliedRolls(minRolls, maxRolls, 'avg', undefined)
    expect(applied.get('sdPct')).toBe(8) // (3+13)/2 = 8
    expect(applied.get('hpBonus')).toBe(80) // (30+130)/2 = 80
  })

  it('honors overrides over preset, per id', () => {
    const overrides = new Map([['sdPct', 7]])
    const applied = computeAppliedRolls(minRolls, maxRolls, 'max', overrides)
    expect(applied.get('sdPct')).toBe(7)
    expect(applied.get('hpBonus')).toBe(130) // still preset=max
  })

  it('default context preserves byte-equivalence to maxRolls', () => {
    const { preset } = DEFAULT_ROLL_CONTEXT
    expect(computeAppliedRolls(minRolls, maxRolls, preset, undefined)).toEqual(
      maxRolls,
    )
  })
})
