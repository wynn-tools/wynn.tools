const EB = 64 // emeralds per emerald block
const LE = 4096 // emeralds per liquid emerald (64 blocks)

/** Render a raw integer emerald price as Wynncraft currency, e.g. 15623 → "3le 52eb 7e". */
export function formatEmeralds(raw: number): string {
  const n = Math.max(0, Math.round(raw))
  if (n === 0)
    return '0e'
  const le = Math.floor(n / LE)
  const eb = Math.floor((n % LE) / EB)
  const e = n % EB
  const parts: string[] = []
  if (le)
    parts.push(`${le}le`)
  if (eb)
    parts.push(`${eb}eb`)
  if (e)
    parts.push(`${e}e`)
  return parts.join(' ')
}
