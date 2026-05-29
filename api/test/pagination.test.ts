import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { decodeCursor, encodeCursor } from '../src/lib/pagination'

describe('pagination cursor', () => {
  it('round-trips a date cursor', () => {
    const c = { c: '2026-01-01T00:00:00.000Z', id: 'abc' }
    const decoded = decodeCursor(encodeCursor(c))
    expect(decoded).toEqual(c)
  })

  it('round-trips a name cursor', () => {
    const c = { n: 'Warrior build', id: 'xyz' }
    const decoded = decodeCursor(encodeCursor(c))
    expect(decoded).toEqual(c)
  })

  it('returns null on garbage input', () => {
    expect(decodeCursor('garbage')).toBeNull()
  })

  it('returns null for old pipe-delimited format', () => {
    const old = Buffer.from('2026-01-01T00:00:00.000Z|abc').toString('base64url')
    expect(decodeCursor(old)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(decodeCursor(undefined)).toBeNull()
  })
})
