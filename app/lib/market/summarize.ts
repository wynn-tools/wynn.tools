import type { PriceCardModel, RawMarketPrice } from './types'

export type MarketMode = 'min' | 'avg' | 'max'

/** Identified price at the chosen mode. Strict null when the per-mode field is missing. */
export function pickId(p: RawMarketPrice, mode: MarketMode): number | null {
  if (mode === 'min')
    return p.lowest_price ?? null
  if (mode === 'max')
    return p.highest_price ?? null
  return p.average_p50_ema_price ?? p.average_mid_80_percent_price ?? null
}

/** Unidentified price at the chosen mode. Strict null when the per-mode field is missing. */
export function pickUnid(p: RawMarketPrice, mode: MarketMode): number | null {
  if (mode === 'min')
    return p.unidentified_lowest_price ?? null
  if (mode === 'max')
    return p.unidentified_highest_price ?? null
  return p.unidentified_average_p50_ema_price ?? p.unidentified_average_mid_80_percent_price ?? null
}

/** Identified headline: EMA preferred, mid-80 fallback. */
export function pickIdHeadline(p: RawMarketPrice): number | null {
  return pickId(p, 'avg')
}

/** Unidentified headline: EMA preferred, mid-80 fallback. */
export function pickUnidHeadline(p: RawMarketPrice): number | null {
  return pickUnid(p, 'avg')
}

export function summarizePrice(payload: RawMarketPrice | null): PriceCardModel {
  if (!payload) {
    return {
      hasData: false,
      identified: { headline: null, count: 0 },
      unidentified: { headline: null, count: 0 },
      lowestPrice: null,
      highestPrice: null,
      timestamp: null,
    }
  }
  return {
    hasData: true,
    identified: { headline: pickIdHeadline(payload), count: payload.total_count ?? 0 },
    unidentified: { headline: pickUnidHeadline(payload), count: payload.unidentified_count ?? 0 },
    lowestPrice: payload.lowest_price,
    highestPrice: payload.highest_price,
    timestamp: payload.timestamp ?? null,
  }
}
