import type { Aspect, RawAspectData } from '~/lib/types/aspect'

// ---------------------------------------------------------------------------
// Input types (new normalized CDN schema)
// ---------------------------------------------------------------------------

interface NormalizedText {
  color?: string
  font?: string
  text: string
  [key: string]: unknown
}

interface CdnAspectAbility {
  base_abil: number
  properties?: Record<string, number>
  effects?: unknown[]
  dependencies?: number[]
}

interface CdnAspectTier {
  threshold: number
  description: NormalizedText[]
  /** Game-mechanics; present only on backfilled snapshots. */
  abilities?: CdnAspectAbility[]
}

export interface CdnAspect {
  id: number
  name: string
  tier: string
  tiers: CdnAspectTier[]
}

// ---------------------------------------------------------------------------
// adaptCdnAspects — convert one per-class CDN file to Aspect[]
// ---------------------------------------------------------------------------

export function adaptCdnAspects(file: { aspects: CdnAspect[] }): Aspect[] {
  return file.aspects.map(a => ({
    displayName: a.name,
    id: a.id,
    tier: a.tier,
    NONE: false,
    tiers: a.tiers.map(t => ({
      threshold: t.threshold,
      description: t.description.map(n => n.text).join(''),
      ...(t.abilities !== undefined ? { abilities: t.abilities } : {}),
    })),
  }))
}

// ---------------------------------------------------------------------------
// mergeClassAspects — merge multiple per-class files into RawAspectData
// ---------------------------------------------------------------------------

export function mergeClassAspects(files: Record<string, { aspects: CdnAspect[] }>): RawAspectData {
  return Object.fromEntries(
    Object.entries(files).map(([cls, f]) => [cls, adaptCdnAspects(f)]),
  )
}
