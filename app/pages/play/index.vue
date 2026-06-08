<script setup lang="ts">
import type { PuzzleMeta, RoundState, WynndleMode } from '~/lib/wynndle/types'
import GameCatalogRow from '~/components/Play/GameCatalogRow.vue'
import { useWynndleAnon } from '~/composables/useWynndleAnon'

definePageMeta({
  layout: 'play',
  pageTransition: { name: 'play-fade', mode: 'out-in' },
})

useSeoMeta({ title: 'Play · wynn.tools', description: 'Daily Wynncraft puzzles.' })

const today = new Date().toISOString().slice(0, 10)

// Live per-mode status for Wynndle. We fetch /v1/wynndle/today for both modes
// in parallel and derive an `unsolved | in-progress | solved` label + guess
// count from the existing round payload. Auth flows through the same anon-key
// + cookie path as the game board itself.
interface TodayResponse { puzzle: PuzzleMeta, round: RoundState | null }

interface ModeStatus {
  label: string
  href: string
  status: 'unsolved' | 'in-progress' | 'solved' | 'bested'
  guessCount: number
}

const apiBase = useRuntimeConfig().public.apiBaseUrl as string
const anon = useWynndleAnon()

const wynndleModes = ref<ModeStatus[]>([
  { label: 'Weapon', href: '/play/wynndle/weapon', status: 'unsolved', guessCount: 0 },
  { label: 'Armor', href: '/play/wynndle/armor', status: 'unsolved', guessCount: 0 },
])

function deriveStatus(round: RoundState | null): { status: ModeStatus['status'], guessCount: number } {
  if (!round)
    return { status: 'unsolved', guessCount: 0 }
  if (round.finished)
    return { status: round.won ? 'solved' : 'bested', guessCount: round.guesses.length }
  if (round.guesses.length > 0)
    return { status: 'in-progress', guessCount: round.guesses.length }
  return { status: 'unsolved', guessCount: 0 }
}

async function loadOne(mode: WynndleMode): Promise<ModeStatus['status'] extends string ? { status: ModeStatus['status'], guessCount: number } : never> {
  const res = await fetch(`${apiBase}/v1/wynndle/today?mode=${mode}`, {
    credentials: 'include',
    headers: { 'x-anon-key': anon.anonKey() },
  })
  if (!res.ok)
    return { status: 'unsolved', guessCount: 0 }
  const body = await res.json() as TodayResponse
  return deriveStatus(body.round)
}

onMounted(async () => {
  const [weapon, armor] = await Promise.all([loadOne('weapon'), loadOne('armor')])
  wynndleModes.value = [
    { label: 'Weapon', href: '/play/wynndle/weapon', ...weapon },
    { label: 'Armor', href: '/play/wynndle/armor', ...armor },
  ]
})

const games = computed(() => [
  {
    key: 'wynndle',
    title: 'WYNNDLE',
    blurb: 'Guess the daily Wynncraft item in ten tries. Two modes.',
    href: '/play/wynndle',
    locked: false,
    modes: wynndleModes.value,
  },
])
</script>

<template>
  <section class="hub">
    <header class="hub-header">
      <span class="hub-kicker">THE PLAY HALL</span>
      <h1 class="hub-invocation">
        Today's puzzles.
      </h1>
      <time class="hub-date">{{ today }}</time>
      <!-- wynn-wynnic is a Latin-to-Wynnic glyph substitution font: regular
           A-Z renders as the in-world script. Hidden word, easter egg for
           anyone who can decode Wynnic. -->
      <div class="hub-sigil" aria-hidden="true">
        ADVENTURER
      </div>
    </header>

    <div class="catalog">
      <GameCatalogRow
        v-for="g in games"
        :key="g.key"
        :title="g.title"
        :blurb="g.blurb"
        :href="g.href"
        :locked="g.locked"
        :modes="g.modes"
      />
    </div>
  </section>
</template>

<style scoped>
.hub {
  display: grid;
  gap: 36px;
  padding: 24px 0 64px;
  max-width: 1100px;
  margin: 0 auto;
}

.hub-header {
  position: relative;
  text-align: center;
  padding: 28px 16px 22px;
  isolation: isolate;
}

.hub-kicker {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--paper-base);
  background: rgb(65 38 36 / 0.5);
  padding: 4px 14px;
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.hub-invocation {
  font-family: var(--font-display);
  font-size: clamp(32px, 5.5vw, 56px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--paper-base);
  margin: 14px 0 6px;
  text-shadow:
    2px 2px 0 rgb(0 0 0 / 0.32),
    0 0 14px rgb(0 0 0 / 0.18);
}

.hub-date {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--paper-light);
  opacity: 0.8;
}

.hub-sigil {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'wynn-wynnic', sans-serif;
  font-size: clamp(64px, 12vw, 140px);
  color: var(--primary);
  opacity: 0.08;
  letter-spacing: 0.15em;
  pointer-events: none;
  z-index: -1;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
}

.catalog {
  display: grid;
  gap: 24px;
}

@media (max-width: 720px) {
  .hub {
    padding: 14px 0 96px;
    gap: 24px;
  }

  .hub-header {
    padding: 18px 8px 12px;
  }

  .catalog {
    gap: 16px;
  }
}
</style>
