import { describe, expect, it } from 'vitest'
import { formatEmeralds, formatEmeraldsCompact } from './format-emeralds'

describe('formatEmeralds', () => {
  it('splits into le / eb / e (3le 52eb 7e = 15623)', () => {
    expect(formatEmeralds(15623)).toBe('3le 52eb 7e')
  })
  it('renders zero as 0e', () => {
    expect(formatEmeralds(0)).toBe('0e')
  })
  it('omits empty units', () => {
    expect(formatEmeralds(64)).toBe('1eb')
    expect(formatEmeralds(4096)).toBe('1le')
    expect(formatEmeralds(7)).toBe('7e')
  })
  it('rounds fractional emeralds', () => {
    expect(formatEmeralds(63.6)).toBe('1eb')
  })
})

describe('formatEmeraldsCompact', () => {
  it('keeps the two most-significant units by default', () => {
    expect(formatEmeraldsCompact(1847282)).toBe('7stx 2le')
  })
  it('honours a custom unit cap', () => {
    expect(formatEmeraldsCompact(1847282, 1)).toBe('7stx')
  })
  it('skips zero units when picking the top ones', () => {
    expect(formatEmeraldsCompact(4096 * 12 + 5)).toBe('12le 5e') // no eb → le + e
  })
  it('renders zero as 0e', () => {
    expect(formatEmeraldsCompact(0)).toBe('0e')
  })
})
