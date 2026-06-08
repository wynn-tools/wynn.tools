import type { WeightProfile } from './weight-types'

type FetchImpl = typeof fetch

export interface WynnpoolConfig {
  baseUrl: string
}

export interface WynnpoolClient {
  fetchWeights: (itemName: string) => Promise<WeightProfile[]>
}

interface WynnpoolWeightRow {
  weight_name?: string
  identifications?: Record<string, number>
}

export function createWynnpoolClient(
  cfg: WynnpoolConfig,
  fetchImpl: FetchImpl = fetch,
): WynnpoolClient {
  const base = cfg.baseUrl.replace(/\/$/, '')

  async function fetchWeights(itemName: string): Promise<WeightProfile[]> {
    const res = await fetchImpl(`${base}/item/${encodeURIComponent(itemName)}/weight`)
    if (res.status === 404)
      return []
    if (!res.ok)
      throw new Error(`Wynnpool request failed: ${res.status}`)
    const body = (await res.json().catch(() => [])) as unknown
    if (!Array.isArray(body))
      return []
    return body
      .filter((r): r is WynnpoolWeightRow => !!r && typeof r === 'object' && typeof (r as WynnpoolWeightRow).weight_name === 'string')
      .map((r) => {
        const scales: Record<string, number> = {}
        const ids = r.identifications ?? {}
        for (const [k, v] of Object.entries(ids)) {
          if (typeof v === 'number')
            scales[k] = v
        }
        return { name: r.weight_name as string, scales }
      })
  }

  return { fetchWeights }
}
