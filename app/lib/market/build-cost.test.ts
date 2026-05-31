import type { BuildCostEntry } from './build-cost'
import { describe, expect, it } from 'vitest'
import { buildCost } from './build-cost'

function priced(over: Partial<BuildCostEntry>): BuildCostEntry {
  return {
    label: 'item',
    name: 'X',
    tier: null,
    count: 1,
    tradeable: true,
    price: { name: 'X', lowest_price: 0, highest_price: 0, average_mid_80_percent_price: 100, average_p50_ema_price: 100, total_count: 5, unidentified_average_mid_80_percent_price: 60, unidentified_average_p50_ema_price: 60, unidentified_count: 2 },
    ...over,
  }
}

describe('buildCost', () => {
  it('sums identified and unidentified totals by count', () => {
    const out = buildCost([priced({ count: 2 }), priced({})])
    expect(out.identifiedTotal).toBe(300) // 100*2 + 100
    expect(out.unidentifiedTotal).toBe(180) // 60*2 + 60
    expect(out.pricedCount).toBe(2)
    expect(out.tradeableCount).toBe(2)
  })

  it('excludes untradeable entries entirely', () => {
    const out = buildCost([priced({}), priced({ tradeable: false, price: null })])
    expect(out.identifiedTotal).toBe(100)
    expect(out.tradeableCount).toBe(1)
    expect(out.pricedCount).toBe(1)
  })

  it('counts tradeable-but-unpriced as a coverage gap', () => {
    const out = buildCost([priced({}), priced({ price: null })])
    expect(out.tradeableCount).toBe(2)
    expect(out.pricedCount).toBe(1)
    expect(out.identifiedTotal).toBe(100)
  })

  it('falls back to the identified headline when unidentified is missing', () => {
    const noUnid = priced({ price: { name: 'X', lowest_price: 0, highest_price: 0, average_mid_80_percent_price: 100, average_p50_ema_price: 100, total_count: 5, unidentified_average_mid_80_percent_price: null, unidentified_average_p50_ema_price: null, unidentified_count: 0 } })
    const out = buildCost([noUnid])
    expect(out.unidentifiedTotal).toBe(100) // falls back to identified
  })
})
