/** Subset of the WynnVentory /price response we consume (snake_case, as upstream sends it). */
export interface RawMarketPrice {
  name: string
  tier?: number | null
  lowest_price: number | null
  highest_price: number | null
  average_price?: number | null
  average_mid_80_percent_price: number | null
  p50_price?: number | null
  average_p50_ema_price: number | null
  total_count: number
  unidentified_lowest_price?: number | null
  unidentified_highest_price?: number | null
  unidentified_average_mid_80_percent_price: number | null
  unidentified_average_p50_ema_price: number | null
  unidentified_count: number
  icon?: string | null
  item_type?: string | null
  timestamp?: string | null
}

export interface PriceSide {
  headline: number | null
  count: number
}

export interface PriceCardModel {
  hasData: boolean
  identified: PriceSide
  unidentified: PriceSide
  lowestPrice: number | null
  highestPrice: number | null
  timestamp: string | null
}
