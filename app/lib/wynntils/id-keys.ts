/**
 * Lazy fetcher for Wynntils' Reference/id_keys.json.
 * Maps the single-byte stat-id used inside Wynntils' encoded item strings
 * to the v3 Wynncraft API identification name (e.g. "rawStrength").
 */

const ID_KEYS_URL = 'https://cdn.wynntils.com/static/Reference/id_keys.json'

let cached: Promise<Map<number, string>> | null = null

export function getIdKeys(fetchImpl: typeof fetch = fetch): Promise<Map<number, string>> {
  if (cached)
    return cached
  const p = (async () => {
    const res = await fetchImpl(ID_KEYS_URL)
    if (!res.ok)
      throw new Error(`Failed to fetch id_keys.json: HTTP ${res.status}`)
    const raw = (await res.json()) as Record<string, unknown>
    const map = new Map<number, string>()
    for (const [name, id] of Object.entries(raw)) {
      if (typeof id === 'number')
        map.set(id, name)
    }
    return map
  })().catch((err) => {
    cached = null // don't poison cache on failure
    throw err
  })
  cached = p
  return p
}

/** Test-only: reset module-level cache between vitest cases. */
export function _resetIdKeysCacheForTests(): void {
  cached = null
}
