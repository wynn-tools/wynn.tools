import { describe, expect, it } from 'vitest'
import { expandItem, idRound } from './expand-item'

type RolledMap = Map<string, number>

function rolls(item: Record<string, unknown>) {
  const ex = expandItem(item)
  return {
    min: ex.get('minRolls') as RolledMap,
    max: ex.get('maxRolls') as RolledMap,
    ex,
  }
}

describe('idRound', () => {
  it('rounds normally', () => {
    expect(idRound(12.4)).toBe(12)
    expect(idRound(12.6)).toBe(13)
  })
  it('zero-rounds to the sign (hack)', () => {
    expect(idRound(0.3)).toBe(1)
    expect(idRound(-0.3)).toBe(-1)
  })
})

describe('expandItem', () => {
  it('rolls a positive non-reversed id 0.3x..1.3x', () => {
    const { min, max } = rolls({ mr: 10 })
    expect(max.get('mr')).toBe(idRound(10 * 1.3))
    expect(min.get('mr')).toBe(idRound(10 * 0.3))
  })

  it('reversed id (spPct1) positive takes the negative branch', () => {
    const { min, max } = rolls({ spPct1: 10 })
    expect(max.get('spPct1')).toBe(idRound(10 * 0.7))
    expect(min.get('spPct1')).toBe(idRound(10 * 1.3))
  })

  it('fixID items do not roll', () => {
    const { min, max, ex } = rolls({ fixID: true, mr: 10 })
    expect(min.get('mr')).toBe(10)
    expect(max.get('mr')).toBe(10)
    expect(ex.get('fixID')).toBe(true)
  })

  it('zero stays zero; small positive uses idRound zero hack', () => {
    const z = rolls({ mr: 0 })
    expect(z.min.get('mr')).toBe(0)
    expect(z.max.get('mr')).toBe(0)
    const small = rolls({ mr: 1 })
    expect(small.min.get('mr')).toBe(1)
    expect(small.max.get('mr')).toBe(1)
  })

  it('copies non-rolled fields directly', () => {
    const { ex } = rolls({ lvl: 105, type: 'bow', mr: 5 })
    expect(ex.get('lvl')).toBe(105)
    expect(ex.get('type')).toBe('bow')
  })
})
