/**
 * Game-mechanics: one ability an aspect tier applies, merged into the atree like
 * a node (mirrors a major-ID ability, minus `class` — aspects are always valid
 * for the build's class). `base_abil` references a node id.
 */
export interface AspectAbility {
  base_abil: number
  properties?: Record<string, number>
  effects?: unknown[]
  dependencies?: number[]
}

/** An aspect tier entry (effects preserved verbatim for the math milestone). */
export interface AspectTier {
  threshold?: number
  description?: string
  /**
   * Ability entries this tier applies. Present only on backfilled snapshots;
   * absent on live data (live v3 API exposes no mechanics).
   */
  abilities?: AspectAbility[]
  [key: string]: unknown
}

export interface Aspect {
  displayName: string
  id: number
  tier: string
  tiers: AspectTier[]
  NONE: boolean
}

/** Raw aspect payload: class name → aspect list. */
export type RawAspectData = Record<string, Aspect[]>
