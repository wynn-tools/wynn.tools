import type { PuzzleMeta, RoundState, WynndleMode } from '~/lib/wynndle/types'
import { useWynndleAnon } from '~/composables/useWynndleAnon'
import { useAuthStore } from '~/stores/auth'

interface TodayResponse { puzzle: PuzzleMeta, round: RoundState | null }
interface MutationResponse { puzzle?: PuzzleMeta, round: RoundState }

export function useWynndle(mode: WynndleMode) {
  const apiBase = useRuntimeConfig().public.apiBaseUrl as string
  const anon = useWynndleAnon()
  const auth = useAuthStore()

  const puzzle = ref<PuzzleMeta | null>(null)
  const round = ref<RoundState | null>(null)
  const status = ref<'idle' | 'loading' | 'submitting' | 'error'>('idle')
  const error = ref<string | null>(null)

  function commonHeaders(): Record<string, string> {
    return { 'x-anon-key': anon.anonKey() }
  }

  function isLoggedIn(): boolean {
    return auth.user != null
  }

  async function refresh() {
    status.value = 'loading'
    error.value = null
    try {
      const res = await fetch(`${apiBase}/v1/wynndle/today?mode=${mode}`, {
        credentials: 'include',
        headers: commonHeaders(),
      })
      if (!res.ok)
        throw new Error(`load failed (${res.status})`)
      const data = await res.json() as TodayResponse
      puzzle.value = data.puzzle
      round.value = data.round
      status.value = 'idle'
    }
    catch (e: unknown) {
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'load failed'
    }
  }

  async function submitGuess(itemId: string) {
    if (status.value === 'submitting' || round.value?.finished)
      return
    status.value = 'submitting'
    error.value = null
    try {
      const res = await fetch(`${apiBase}/v1/wynndle/guess`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', ...commonHeaders() },
        body: JSON.stringify({ mode, itemId }),
      })
      const body = await res.json().catch(() => null) as (MutationResponse & { error?: string }) | null
      if (!res.ok)
        throw new Error(body?.error ?? 'guess failed')
      round.value = body!.round
      if (round.value?.finished && !isLoggedIn() && puzzle.value)
        anon.recordAnon(mode, puzzle.value.date, round.value.won)
      status.value = 'idle'
    }
    catch (e: unknown) {
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'guess failed'
    }
  }

  async function revealHint() {
    if (round.value?.finished)
      return
    error.value = null
    try {
      const res = await fetch(`${apiBase}/v1/wynndle/hint`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', ...commonHeaders() },
        body: JSON.stringify({ mode }),
      })
      const body = await res.json().catch(() => null) as (MutationResponse & { error?: string }) | null
      if (!res.ok)
        throw new Error(body?.error ?? 'hint failed')
      round.value = body!.round
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'hint failed'
    }
  }

  return { puzzle, round, status, error, refresh, submitGuess, revealHint }
}
