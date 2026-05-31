import { describe, expect, it } from 'vitest'
import { pickIdHeadline, pickUnidHeadline, summarizePrice } from './summarize'

const full = {
  name: 'Divzer',
  lowest_price: 8000,
  highest_price: 25000,
  average_mid_80_percent_price: 13800,
  average_p50_ema_price: 13650,
  total_count: 24,
  unidentified_average_mid_80_percent_price: 9000,
  unidentified_average_p50_ema_price: null,
  unidentified_count: 3,
  timestamp: '2026-03-14T12:00:00Z',
}

describe('summarizePrice', () => {
  it('prefers the EMA price for the identified headline', () => {
    expect(pickIdHeadline(full)).toBe(13650)
  })
  it('falls back to mid-80 when EMA is missing', () => {
    expect(pickIdHeadline({ ...full, average_p50_ema_price: null })).toBe(13800)
    expect(pickUnidHeadline(full)).toBe(9000) // unid EMA null → mid-80
  })
  it('builds a card model with both headlines and counts', () => {
    const m = summarizePrice(full)
    expect(m.hasData).toBe(true)
    expect(m.identified.headline).toBe(13650)
    expect(m.unidentified.headline).toBe(9000)
    expect(m.identified.count).toBe(24)
    expect(m.lowestPrice).toBe(8000)
  })
  it('flags missing data for a null payload', () => {
    expect(summarizePrice(null).hasData).toBe(false)
  })
  it('returns a null headline when both EMA and mid-80 are absent', () => {
    const m = summarizePrice({ ...full, average_p50_ema_price: null, average_mid_80_percent_price: null })
    expect(m.identified.headline).toBeNull()
    expect(m.hasData).toBe(true)
  })
})
