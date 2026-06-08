import type { StreakState } from '~/lib/wynndle/streak-anon'
import type { WynndleMode } from '~/lib/wynndle/types'
import { applyAnonResult } from '~/lib/wynndle/streak-anon'

const ZERO: StreakState = { current: 0, longest: 0, lastSolved: null }

export function useWynndleAnon() {
  function anonKey(): string {
    if (typeof window === 'undefined')
      return ''
    let k = window.localStorage.getItem('wynndle.anon.key')
    if (!k) {
      k = crypto.randomUUID()
      window.localStorage.setItem('wynndle.anon.key', k)
    }
    return k
  }
  function getStreak(mode: WynndleMode): StreakState {
    if (typeof window === 'undefined')
      return ZERO
    const raw = window.localStorage.getItem(`wynndle.anon.streak.v1.${mode}`)
    return raw ? JSON.parse(raw) as StreakState : ZERO
  }
  function recordAnon(mode: WynndleMode, date: string, won: boolean): StreakState {
    const next = applyAnonResult(getStreak(mode), date, won)
    window.localStorage.setItem(`wynndle.anon.streak.v1.${mode}`, JSON.stringify(next))
    return next
  }
  return { anonKey, getStreak, recordAnon }
}
