import { IDENTIFICATION_MAP, REQUIREMENT_MAP, TOME_TYPE_MAP } from './key-maps'

// ---------------------------------------------------------------------------
// Input types (new normalized CDN schema)
// ---------------------------------------------------------------------------

export interface TomeIdentificationEntry {
  min: number
  max: number
  raw: number
}

export interface OutputTome {
  id: number
  name: string
  displayName: string
  type: string
  tier: string
  requirements?: {
    level?: number
  }
  identifications?: Record<string, TomeIdentificationEntry>
}

// ---------------------------------------------------------------------------
// adaptCdnTome — convert one OutputTome to the hppeng raw record
// ---------------------------------------------------------------------------

export function adaptCdnTome(tome: OutputTome): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  // Pass-throughs
  out.id = tome.id
  out.name = tome.name
  out.displayName = tome.displayName
  out.tier = tome.tier

  // type: remap snake_case → camelCase; fall back to raw input if unmapped
  out.type = TOME_TYPE_MAP[tome.type] ?? tome.type

  // category is always 'tome' for tome records
  out.category = 'tome'

  // lvl from requirements.level (skip if null/undefined)
  const lvl = tome.requirements?.level
  if (lvl != null) {
    out[REQUIREMENT_MAP.level] = lvl
  }

  // identifications: use .raw value, map to shorthand key
  for (const [officialKey, entry] of Object.entries(tome.identifications ?? {})) {
    const shortKey = IDENTIFICATION_MAP[officialKey]
    if (shortKey === undefined)
      continue
    out[shortKey] = entry.raw
  }

  return out
}
