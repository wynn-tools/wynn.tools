import { describe, expect, it } from 'vitest'
import { nextSpawnIn } from './schedule'

describe('nextSpawnIn', () => {
  const NOW = Date.parse('2026-06-12T00:00:00Z')
  it('returns seconds until a future spawn', () => {
    expect(nextSpawnIn('2026-06-12T00:01:30Z', NOW)).toBe(90)
  })
  it('returns null for null schedule', () => {
    expect(nextSpawnIn(null, NOW)).toBeNull()
  })
  it('returns null for a past schedule', () => {
    expect(nextSpawnIn('2025-01-01T00:00:00Z', NOW)).toBeNull()
  })
})
