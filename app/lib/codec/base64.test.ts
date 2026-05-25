import { describe, expect, it } from 'vitest'
import { Base64 } from './base64'

describe('base64', () => {
  it('maps digits 0..63 in order', () => {
    expect(Base64.fromIntN(0, 1)).toBe('0')
    expect(Base64.fromIntN(12, 1)).toBe('C')
    expect(Base64.fromIntN(63, 1)).toBe('-')
    expect(Base64.fromIntN(62, 1)).toBe('+')
    expect(Base64.toInt('C')).toBe(12)
    expect(Base64.toInt('-')).toBe(63)
  })

  it('fromIntV is minimal width, fromIntN is fixed width', () => {
    expect(Base64.fromIntV(0)).toBe('0')
    expect(Base64.fromIntV(64)).toBe('10')
    expect(Base64.fromIntN(64, 3)).toBe('010')
  })

  it('toInt round-trips multi-char strings', () => {
    expect(Base64.toInt(Base64.fromIntN(1000, 3))).toBe(1000)
  })

  it('toIntSigned sign-extends', () => {
    expect(Base64.toIntSigned('-')).toBe(-1)
    expect(Base64.toIntSigned('0')).toBe(0)
  })

  it('isB64 validates membership', () => {
    expect(Base64.isB64('CU0XJn')).toBe(true)
    expect(Base64.isB64('hello+world-')).toBe(true)
    expect(Base64.isB64('no/slash')).toBe(false)
    expect(Base64.isB64('space ')).toBe(false)
  })
})
