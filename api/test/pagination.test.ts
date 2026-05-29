import { describe, expect, it } from 'vitest'
import { decodeCursor, encodeCursor } from '../src/lib/pagination'

describe('pagination cursor', () => {
  it('round-trips', () => {
    const c = { createdAt: new Date('2026-01-01T00:00:00Z'), id: 'abc' }
    const decoded = decodeCursor(encodeCursor(c))
    expect(decoded?.id).toBe('abc')
    expect(decoded?.createdAt.toISOString()).toBe(c.createdAt.toISOString())
  })

  it('returns null on garbage', () => {
    expect(decodeCursor('garbage')).toBeNull()
  })
})
