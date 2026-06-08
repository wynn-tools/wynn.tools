export interface WynnventoryConfig {
  apiKey: string
  baseUrl: string
}

export interface FetchPriceOpts {
  tier?: number
  shiny?: boolean
}

export interface FetchListingsOpts {
  sort?: string
  page?: number
  page_size?: number
}

type FetchImpl = typeof fetch

export interface WynnventoryClient {
  fetchPrice: (name: string, opts?: FetchPriceOpts) => Promise<Record<string, unknown> | null>
  fetchListings: (name: string, opts?: FetchListingsOpts) => Promise<Record<string, unknown>>
}

export function createWynnventoryClient(
  cfg: WynnventoryConfig,
  fetchImpl: FetchImpl = fetch,
): WynnventoryClient {
  const base = cfg.baseUrl.replace(/\/$/, '')

  async function fetchPrice(name: string, opts: FetchPriceOpts = {}): Promise<Record<string, unknown> | null> {
    const params = new URLSearchParams()
    if (opts.tier != null)
      params.set('tier', String(opts.tier))
    if (opts.shiny != null)
      params.set('shiny', String(opts.shiny))
    const qs = params.toString()
    const url = `${base}/api/trademarket/item/${encodeURIComponent(name)}/price${qs ? `?${qs}` : ''}`

    const res = await fetchImpl(url, { headers: { Authorization: `Api-Key ${cfg.apiKey}` } })
    if (res.ok)
      return await res.json().catch(() => null)
    if (res.status === 404)
      return null
    throw new Error(`WynnVentory request failed: ${res.status}`)
  }

  async function fetchListings(name: string, opts: FetchListingsOpts = {}): Promise<Record<string, unknown>> {
    const params = new URLSearchParams()
    if (opts.sort)
      params.set('sort', opts.sort)
    if (opts.page != null)
      params.set('page', String(opts.page))
    if (opts.page_size != null)
      params.set('page_size', String(opts.page_size))
    const qs = params.toString()
    const url = `${base}/api/trademarket/listings/${encodeURIComponent(name)}${qs ? `?${qs}` : ''}`

    const res = await fetchImpl(url, {
      headers: { Authorization: `Api-Key ${cfg.apiKey}` },
    })
    if (!res.ok)
      return { items: [] }
    return await res.json().catch(() => ({ items: [] }))
  }

  return { fetchPrice, fetchListings }
}
