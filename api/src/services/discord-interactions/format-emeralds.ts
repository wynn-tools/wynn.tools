// Mirror of app/lib/market/format-emeralds.ts — kept in api/ so the Discord
// bot can format prices without depending on the frontend bundle.
const STX = 262144 // emeralds per stack of liquid emeralds (64 le)
const EB = 64 // emeralds per emerald block
const LE = 4096 // emeralds per liquid emerald (64 blocks)

export function formatEmeraldsCompact(raw: number, maxUnits = 2): string {
  const n = Math.max(0, Math.round(raw))
  if (n === 0)
    return '0e'
  const units: [number, string][] = [
    [Math.floor(n / STX), 'stx'],
    [Math.floor((n % STX) / LE), 'le'],
    [Math.floor((n % LE) / EB), 'eb'],
    [n % EB, 'e'],
  ]
  const nonzero = units.filter(([v]) => v > 0).map(([v, u]) => `${v}${u}`)
  return nonzero.slice(0, maxUnits).join(' ')
}
