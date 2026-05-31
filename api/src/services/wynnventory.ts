export interface WynnventoryConfig {
  apiKey: string
  baseUrl: string
}

export interface FetchPriceOpts {
  tier?: number
  shiny?: boolean
}

export interface WynnventoryClient {
  fetchPrice: (name: string, opts?: FetchPriceOpts) => Promise<unknown | null>
}

export function createWynnventoryClient(
  cfg: WynnventoryConfig,
  fetchImpl: typeof fetch = fetch,
): WynnventoryClient {
  const base = cfg.baseUrl.replace(/\/$/, '')

  async function fetchPrice(name: string, opts: FetchPriceOpts = {}): Promise<unknown | null> {
    const params = new URLSearchParams()
    if (opts.tier != null)
      params.set('tier', String(opts.tier))
    if (opts.shiny != null)
      params.set('shiny', String(opts.shiny))
    const qs = params.toString()
    const url = `${base}/api/trademarket/item/${encodeURIComponent(name)}/price${qs ? `?${qs}` : ''}`

    const res = await fetchImpl(url, { headers: { Authorization: `Api-Key ${cfg.apiKey}` } })
    if (!res.ok)
      return null
    return await res.json().catch(() => null)
  }

  return { fetchPrice }
}
