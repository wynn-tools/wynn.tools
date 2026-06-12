import { describe, expect, it } from 'vitest'
import { formatCountdown, nextSpawnIn } from './schedule'

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

describe('formatCountdown', () => {
  it('formats sub-minute as seconds', () => {
    expect(formatCountdown(30)).toBe('30s')
  })
  it('formats sub-hour as minutes and seconds', () => {
    expect(formatCountdown(330)).toBe('5m 30s')
  })
  it('formats multi-hour as hours and minutes (no seconds)', () => {
    expect(formatCountdown(8109)).toBe('2h 15m')
  })
  it('floors to 0 once exhausted', () => {
    expect(formatCountdown(0)).toBe('0s')
    expect(formatCountdown(-1)).toBe('0s')
  })
})
