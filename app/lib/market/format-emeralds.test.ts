import { describe, expect, it } from 'vitest'
import { formatEmeralds } from './format-emeralds'

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
