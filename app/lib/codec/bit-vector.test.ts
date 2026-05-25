import { describe, expect, it } from 'vitest'
import { BitVector, BitVectorCursor } from './bit-vector'

describe('bitVector', () => {
  it('round-trips appended fields through a cursor', () => {
    const v = new BitVector(0, 0)
    v.append(0xC, 6)
    v.append(29, 10)
    v.append(5, 3)
    const cur = new BitVectorCursor(v)
    expect(cur.advanceBy(6)).toBe(0xC)
    expect(cur.advanceBy(10)).toBe(29)
    expect(cur.advanceBy(3)).toBe(5)
    expect(cur.end()).toBe(true)
  })

  it('round-trips a B64 string through toB64', () => {
    const original = 'CU0XJn'
    const v = new BitVector(original, 0)
    expect(v.toB64()).toBe(original)
  })

  it('appendB64 then read matches the source string', () => {
    const v = new BitVector(0, 0)
    v.appendB64('CU0')
    expect(v.toB64()).toBe('CU0')
  })

  it('merge concatenates in order', () => {
    const a = new BitVector(0, 0)
    a.append(1, 2)
    const b = new BitVector(0, 0)
    b.append(3, 4)
    const out = new BitVector(0, 0)
    out.merge([a, b])
    const cur = new BitVectorCursor(out)
    expect(cur.advanceBy(2)).toBe(1)
    expect(cur.advanceBy(4)).toBe(3)
  })

  it('append fits-vs-overflow', () => {
    const v = new BitVector(0, 0)
    expect(() => v.append(7, 3)).not.toThrow()
    const w = new BitVector(0, 0)
    expect(() => w.append(8, 3)).toThrow()
  })

  it('cursor advance and bounds', () => {
    const v = new BitVector(0, 0)
    v.append(1, 1)
    v.append(0, 1)
    const cur = new BitVectorCursor(v)
    expect(cur.advance()).toBe(1)
    expect(cur.advance()).toBe(0)
    expect(() => cur.advance()).toThrow()
  })
})
