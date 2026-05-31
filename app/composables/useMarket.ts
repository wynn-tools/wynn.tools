import type { RawMarketPrice } from '~/lib/market/types'
import { useApi } from '~/composables/useApi'

/** Daily history snapshot from WynnVentory's PUBLIC /history endpoint. */
export interface MarketHistoryPoint {
  timestamp: string
  average_mid_80_percent_price: number | null
  average_price: number | null
}

export function useMarket() {
  const api = useApi()

  /** Single item price (proxied — needs the site key). */
  async function price(name: string, opts?: { tier?: number, shiny?: boolean }): Promise<RawMarketPrice | null> {
    return api.getPrice(name, opts)
  }

  /** Batch prices for a build (proxied). */
  async function prices(items: { name: string, tier?: number }[]): Promise<(RawMarketPrice | null)[]> {
    const { results } = await api.getBuildPrices(items)
    return results
  }

  /**
   * Daily price history. Tries WynnVentory's PUBLIC endpoint directly; if CORS
   * blocks the browser call, Task 9 swaps this to the backend forwarder.
   */
  async function history(name: string): Promise<MarketHistoryPoint[]> {
    const res = await fetch(`https://wynnventory.com/api/trademarket/history/${encodeURIComponent(name)}`)
    if (!res.ok)
      return []
    return await res.json().catch(() => [])
  }

  return { price, prices, history }
}
