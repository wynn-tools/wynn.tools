/** An aspect tier entry (effects preserved verbatim for the math milestone). */
export interface AspectTier {
  threshold?: number
  description?: string
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
