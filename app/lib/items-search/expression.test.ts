import type { SearchItem } from './types'
import { describe, expect, it } from 'vitest'
import { parseExpression } from './expression'

function item(ids: Record<string, { min: number, max: number, raw: number }>): SearchItem {
  return { identifications: ids, base: {} } as unknown as SearchItem
}

describe('parseExpression — basic grammar', () => {
  it('numbers, +, comparisons', () => {
    const p = parseExpression('1 + 2 >= 3')
    expect(p.ok).toBe(true)
    if (p.ok)
      expect(p.eval(item({}), 'possible')).toBe(true)
  })
  it('reports a clean error on syntax garbage', () => {
    const p = parseExpression('str + ')
    expect(p.ok).toBe(false)
  })
})

describe('parseExpression — identifiers + rollBasis', () => {
  const i = item({ rawStrength: { min: 3, max: 13, raw: 10 } })
  it('short-code `str` resolves to playerFavored at possible', () => {
    const p = parseExpression('str >= 13')
    expect(p.ok).toBe(true)
    if (p.ok) {
      expect(p.eval(i, 'possible')).toBe(true)
      expect(p.eval(i, 'guaranteed')).toBe(false)
    }
  })
  it('min(str) is literal entry.min regardless of rollBasis', () => {
    const p = parseExpression('min(str) >= 3')
    expect(p.ok).toBe(true)
    if (p.ok) {
      expect(p.eval(i, 'possible')).toBe(true)
      expect(p.eval(i, 'guaranteed')).toBe(true)
    }
  })
  it('max(str), raw(str) work', () => {
    const a = parseExpression('max(str) == 13')
    const b = parseExpression('raw(str) == 10')
    expect(a.ok && a.eval(i, 'possible')).toBe(true)
    expect(b.ok && b.eval(i, 'possible')).toBe(true)
  })
  it('missing identifier resolves to 0', () => {
    const p = parseExpression('mr + 1 == 1')
    expect(p.ok).toBe(true)
    if (p.ok)
      expect(p.eval(i, 'possible')).toBe(true)
  })
  it('stat-sum preset name works', () => {
    const p = parseExpression('spSum >= 13')
    expect(p.ok).toBe(true)
    if (p.ok)
      expect(p.eval(i, 'possible')).toBe(true)
  })
})

describe('parseExpression — boolean ops', () => {
  it('and / or / not', () => {
    const p = parseExpression('not (1 > 2) and (3 < 4 or 5 == 5)')
    expect(p.ok).toBe(true)
    if (p.ok)
      expect(p.eval(item({}), 'possible')).toBe(true)
  })
})
