export interface IdentRange {
  min: number
  max: number
  raw: number
}

/**
 * Per-stat roll percentage [0..100], or null for fixed-value IDs.
 * Mirrors Wynntils' ItemStatInfoFeature: closer to the "good" end of the range = higher %.
 * And pass `inverted = true` for detrimental stats (e.g. spell costs): low number = higher %.
 */
export function rollPercent(actual: number, range: IdentRange, inverted = false): number | null {
  const lo = Math.min(range.min, range.max)
  const hi = Math.max(range.min, range.max)
  if (lo === hi)
    return null
  const pct = inverted
    ? ((hi - actual) / (hi - lo)) * 100
    : ((actual - lo) / (hi - lo)) * 100
  if (pct < 0)
    return 0
  if (pct > 100)
    return 100
  return pct
}

export function overallRollPercent(
  perStat: Array<number | null>,
): number | null {
  const xs = perStat.filter((v): v is number => v != null)
  if (xs.length === 0)
    return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

const TIERS = [
  { lt: 20, name: '--inspect-roll-red' as const },
  { lt: 50, name: '--inspect-roll-gold' as const },
  { lt: 80, name: '--inspect-roll-yellow' as const },
  { lt: 100, name: '--inspect-roll-green' as const },
] as const

export type RollColorVar
  = | '--inspect-roll-red'
    | '--inspect-roll-gold'
    | '--inspect-roll-yellow'
    | '--inspect-roll-green'
    | '--inspect-roll-aqua'

export function rollColorVar(pct: number): RollColorVar {
  for (const t of TIERS) {
    if (pct < t.lt)
      return t.name
  }
  return '--inspect-roll-aqua'
}
