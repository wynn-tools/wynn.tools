export function nextSpawnIn(schedule: string | null, nowMs: number): number | null {
  if (!schedule)
    return null
  const t = Date.parse(schedule)
  if (Number.isNaN(t) || t < nowMs)
    return null
  return Math.floor((t - nowMs) / 1000)
}

/**
 * Friendly duration label: `"3h 5m"`, `"5m 30s"`, `"30s"`. The largest non-zero
 * unit determines the shape; seconds are dropped once minutes are present in
 * a multi-hour window.
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0)
    return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0)
    return `${h}h ${m}m`
  if (m > 0)
    return `${m}m ${s}s`
  return `${s}s`
}
