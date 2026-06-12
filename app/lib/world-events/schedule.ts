export function nextSpawnIn(schedule: string | null, nowMs: number): number | null {
  if (!schedule)
    return null
  const t = Date.parse(schedule)
  if (Number.isNaN(t) || t < nowMs)
    return null
  return Math.floor((t - nowMs) / 1000)
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m${s.toString().padStart(2, '0')}s`
}
