import type { WeightProfile } from './weight-types'

type FetchImpl = typeof fetch

export interface NoriConfig {
  baseUrl: string
}

export interface NoriClient {
  fetchWeights: (encoded: string) => Promise<WeightProfile[]>
}

interface NoriResponse {
  Result?: {
    scales?: Record<string, Record<string, number>>
  }
}

export function createNoriClient(
  cfg: NoriConfig,
  fetchImpl: FetchImpl = fetch,
): NoriClient {
  const base = cfg.baseUrl.replace(/\/$/, '')

  async function fetchWeights(encoded: string): Promise<WeightProfile[]> {
    const res = await fetchImpl(`${base}/api/item/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encoded_item: encoded }),
    })
    if (res.status === 404)
      return []
    if (!res.ok)
      throw new Error(`Nori request failed: ${res.status}`)
    const body = (await res.json().catch(() => ({}))) as NoriResponse
    const map = body?.Result?.scales ?? {}
    const profiles: WeightProfile[] = []
    for (const [name, scales] of Object.entries(map)) {
      if (!scales || typeof scales !== 'object')
        continue
      const cleaned: Record<string, number> = {}
      for (const [k, v] of Object.entries(scales)) {
        if (typeof v === 'number')
          cleaned[k] = v
      }
      profiles.push({ name, scales: cleaned })
    }
    return profiles
  }

  return { fetchWeights }
}
