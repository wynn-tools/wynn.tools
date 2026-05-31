import type { RawMarketPrice } from '~/lib/market/types'
import { useApi } from '~/composables/useApi'

/** Daily history snapshot from WynnVentory's PUBLIC /history endpoint. */
export interface MarketHistoryPoint {
  timestamp: string
  average_mid_80_percent_price: number | null
  average_price: number | null
  p50_price?: number | null
  total_count?: number | null
}

export function useMarket() {
  const api = useApi()
  const config = useRuntimeConfig()

  /** Single item price (proxied — needs the site key). */
  async function price(name: string, opts?: { tier?: number, shiny?: boolean }): Promise<RawMarketPrice | null> {
    return api.getPrice(name, opts)
  }

  /** Batch prices for a build (proxied). */
  async function prices(items: { name: string, tier?: number }[]): Promise<(RawMarketPrice | null)[]> {
    const { results } = await api.getBuildPrices(items)
    return results
  }

  /** Daily price history (proxied via backend — WynnVentory public endpoint has no CORS headers). */
  async function history(name: string): Promise<MarketHistoryPoint[]> {
    const res = await fetch(`${config.public.apiBaseUrl}/v1/market/history/${encodeURIComponent(name)}`, { credentials: 'include' })
    if (!res.ok)
      return []
    return await res.json().catch(() => [])
  }

  return { price, prices, history }
}
