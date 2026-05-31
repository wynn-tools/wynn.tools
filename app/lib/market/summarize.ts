import type { PriceCardModel, RawMarketPrice } from './types'

/** Identified headline: EMA preferred, mid-80 fallback. */
export function pickIdHeadline(p: RawMarketPrice): number | null {
  return p.average_p50_ema_price ?? p.average_mid_80_percent_price ?? null
}

/** Unidentified headline: EMA preferred, mid-80 fallback. */
export function pickUnidHeadline(p: RawMarketPrice): number | null {
  return p.unidentified_average_p50_ema_price ?? p.unidentified_average_mid_80_percent_price ?? null
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
    lowestPrice: payload.lowest_price ?? null,
    highestPrice: payload.highest_price ?? null,
    timestamp: payload.timestamp ?? null,
  }
}
