export interface CdnMajorIdAbility {
  class: string
  base_abil: number
  properties?: Record<string, number>
  effects?: unknown[]
  dependencies?: number[]
}

export interface CdnMajorIdEntry {
  displayName: string
  description: string
  abilities: CdnMajorIdAbility[]
}

/** Map from display name (e.g. "Furious Effigy") → entry. */
export type RawMajorIdData = Map<string, CdnMajorIdEntry>

/**
 * Convert majid.json (Record<SCREAMING_CASE, CdnMajorIdEntry>) to a Map that
 * handles both lookup styles used across data sources:
 *  - CDN items store major IDs as display names ("Furious Effigy")
 *  - WynnBuilder items store them as SCREAMING_CASE keys ("FURIOUS_EFFIGY")
 * Both are indexed so either can be looked up directly.
 */
export function adaptCdnMajorIds(file: Record<string, CdnMajorIdEntry>): RawMajorIdData {
  const out: RawMajorIdData = new Map()
  for (const [key, entry] of Object.entries(file)) {
    out.set(entry.displayName, entry)
    out.set(key, entry)
  }
  return out
}
