export interface StreakState { current: number, longest: number, lastSolved: string | null }

function isPrevDay(prev: string, today: string): boolean {
  const d = new Date(`${prev}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10) === today
}

export function applyAnonResult(s: StreakState, date: string, won: boolean): StreakState {
  if (!won)
    return { current: 0, longest: s.longest, lastSolved: s.lastSolved }
  const current = s.lastSolved && isPrevDay(s.lastSolved, date) ? s.current + 1 : 1
  return { current, longest: Math.max(s.longest, current), lastSolved: date }
}
