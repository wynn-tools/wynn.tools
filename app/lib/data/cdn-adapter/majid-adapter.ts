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
 * Convert majid.json (Record<SCREAMING_CASE, CdnMajorIdEntry>) to a Map
 * keyed by display name so item major ID strings can be looked up directly.
 */
export function adaptCdnMajorIds(file: Record<string, CdnMajorIdEntry>): RawMajorIdData {
  const out: RawMajorIdData = new Map()
  for (const entry of Object.values(file))
    out.set(entry.displayName, entry)
  return out
}
