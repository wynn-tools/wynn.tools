// Day 1 of Wynndle is 2026-06-09 UTC. The puzzle number for any date is
// computed as the number of UTC days since the anchor, plus 1. Single source
// of truth — the game board's challenge header, the archive list, and the
// per-day archive page all derive their day numbers from here.

export const WYNNDLE_ANCHOR_UTC = Date.UTC(2026, 5, 9)

/** Returns 1-based Wynndle puzzle number for a `YYYY-MM-DD` date string. */
export function puzzleNumberFor(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const t = Date.UTC(y!, (m! - 1), d!)
  return Math.floor((t - WYNNDLE_ANCHOR_UTC) / 86_400_000) + 1
}
