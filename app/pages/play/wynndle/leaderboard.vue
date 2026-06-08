<script setup lang="ts">
import type { WynndleMode } from '~/lib/wynndle/types'
import Leaderboard from '~/components/Wynndle/Leaderboard.vue'

definePageMeta({
  layout: 'play',
  pageTransition: { name: 'play-fade', mode: 'out-in' },
})

interface DailyRow { rank: number, username: string, guesses: number, hints: number, durationMs: number | null }

const route = useRoute()
const router = useRouter()
const mode = computed<WynndleMode>(() => (route.query.mode as WynndleMode) === 'armor' ? 'armor' : 'weapon')
const data = ref<{ daily: DailyRow[] }>({ daily: [] })

async function load() {
  const base = useRuntimeConfig().public.apiBaseUrl as string
  const res = await fetch(`${base}/v1/wynndle/leaderboard?mode=${mode.value}`, { credentials: 'include' })
  if (res.ok)
    data.value = await res.json()
}

watchEffect(load)

function pick(m: WynndleMode) {
  router.replace({ query: { ...route.query, mode: m } })
}

const today = new Date().toISOString().slice(0, 10)

useSeoMeta({ title: 'Wynndle leaderboard · wynn.tools' })
</script>

<template>
  <section class="lb-page">
    <header class="lb-header">
      <span class="lb-kicker">LEADERBOARD</span>
      <h1 class="lb-title">
        {{ mode === 'weapon' ? 'Weapon' : 'Armor' }} of the day.
      </h1>
      <time class="lb-date">TODAY · {{ today }}</time>
    </header>

    <div class="lb-tabs" role="tablist" aria-label="Wynndle mode">
      <button
        type="button"
        class="lb-tab"
        :class="{ 'is-active': mode === 'weapon' }"
        :aria-pressed="mode === 'weapon'"
        role="tab"
        @click="pick('weapon')"
      >
        Weapon
      </button>
      <button
        type="button"
        class="lb-tab"
        :class="{ 'is-active': mode === 'armor' }"
        :aria-pressed="mode === 'armor'"
        role="tab"
        @click="pick('armor')"
      >
        Armor
      </button>
    </div>

    <div class="lb-frame">
      <Leaderboard :rows="data.daily" />
    </div>
  </section>
</template>

<style scoped>
.lb-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 0 64px;
  display: grid;
  gap: 20px;
}

.lb-header {
  text-align: center;
  display: grid;
  gap: 6px;
  padding: 18px 0;
}

.lb-kicker {
  display: inline-block;
  justify-self: center;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--paper-base);
  background: rgb(65 38 36 / 0.5);
  padding: 4px 14px;
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.lb-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4.5vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--paper-base);
  margin: 6px 0;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.3);
}

.lb-date {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--paper-light);
  opacity: 0.78;
}

/* Sub-mode tabs (Weapon / Armor) matching the game board's in-page tabs. */
.lb-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: rgb(65 38 36 / 0.32);
  border: 2px solid var(--paper-bd);
  justify-self: center;
}

.lb-tab {
  padding: 8px 22px;
  background: var(--paper-base);
  color: var(--paper-text);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 2px solid var(--paper-bd);
  cursor: pointer;
  transition:
    background-color 0.12s ease-out,
    color 0.12s ease-out;
}

.lb-tab:hover {
  background: var(--paper-light);
}

.lb-tab.is-active {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
}

.lb-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.lb-frame {
  background: var(--paper-base);
  padding: 18px;
  box-shadow: var(--wood-shadow-medium);
}

@media (max-width: 720px) {
  .lb-page {
    padding: 14px 0 96px;
    gap: 14px;
  }

  .lb-frame {
    padding: 12px;
  }
}
</style>
