import { describe, expect, it } from 'vitest'
import { BitVectorCursor } from './bit-vector'
import { decodeHeader, encodeHeader, VECTOR_FLAG, VERSION_BITLEN } from './header'

describe('header', () => {
  it('has the canonical constants', () => {
    expect(VECTOR_FLAG).toBe(0xC)
    expect(VERSION_BITLEN).toBe(10)
  })

  it('encodes flag + version and decodes the version back', () => {
    const v = encodeHeader(29)
    const cur = new BitVectorCursor(v)
    expect(decodeHeader(cur)).toBe(29)
  })

  it('latest-version header starts with the corpus prefix', () => {
    // 'C' = VECTOR_FLAG (0xC = 12), 'U' = Base64[30]; real builds use version 30 → 'CU'
    expect(encodeHeader(30).toB64().startsWith('CU')).toBe(true)
  })
})
