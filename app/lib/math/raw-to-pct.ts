/** Combine a raw stat and a % stat, capped (negative raw can't cross 0). Port of utils.js rawToPct. */
export function rawToPct(raw: number, pct: number): number {
  if (raw < 0)
    return Math.min(0, raw - raw * pct)
  if (raw > 0)
    return raw + raw * pct
  return 0
}

/** Like rawToPct but uncapped (sign can flip). Port of utils.js rawToPctUncapped. */
export function rawToPctUncapped(raw: number, pct: number): number {
  if (raw < 0)
    return raw - raw * pct
  if (raw > 0)
    return raw + raw * pct
  return 0
}
