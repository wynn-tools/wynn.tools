<script setup lang="ts">
import type { WynndleMode } from '~/lib/wynndle/types'
import { TIER_COLORS } from '~/lib/items/tooltip'
import { puzzleNumberFor } from '~/lib/wynndle/anchor'

definePageMeta({
  layout: 'play',
  pageTransition: { name: 'play-fade', mode: 'out-in' },
})

const route = useRoute()
const router = useRouter()
const mode = computed<WynndleMode>(() => (route.query.mode as WynndleMode) === 'armor' ? 'armor' : 'weapon')

// The /v1/wynndle/archive endpoint now ships itemRarity alongside the date
// and name, derived from the denormalized column on wynndle_puzzles. Per-row
// result/guess/hint metadata is still waiting on a backend extension; until
// then those columns render as "View →".
const rows = ref<{ date: string, itemName: string, itemRarity?: string, result?: 'solved' | 'bested' | 'missed', guesses?: number, hints?: number }[]>([])

async function load() {
  const base = useRuntimeConfig().public.apiBaseUrl as string
  const res = await fetch(`${base}/v1/wynndle/archive?mode=${mode.value}`, { credentials: 'include' })
  if (res.ok)
    rows.value = await res.json()
}

watchEffect(load)

function pick(m: WynndleMode) {
  router.replace({ query: { ...route.query, mode: m } })
}

function rarityColor(rarity?: string) {
  if (!rarity)
    return TIER_COLORS.Normal
  const key = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase()
  return TIER_COLORS[key] ?? TIER_COLORS.Normal
}

const dayNumber = puzzleNumberFor

useSeoMeta({ title: 'Wynndle archive · wynn.tools' })
</script>

<template>
  <section class="archive-page">
    <header class="archive-header">
      <span class="archive-kicker">ARCHIVE</span>
      <h1 class="archive-title">
        Past Wynndle puzzles.
      </h1>
    </header>

    <div class="archive-tabs" role="tablist" aria-label="Wynndle mode">
      <button
        type="button"
        class="archive-tab"
        :class="{ 'is-active': mode === 'weapon' }"
        :aria-pressed="mode === 'weapon'"
        role="tab"
        @click="pick('weapon')"
      >
        Weapon
      </button>
      <button
        type="button"
        class="archive-tab"
        :class="{ 'is-active': mode === 'armor' }"
        :aria-pressed="mode === 'armor'"
        role="tab"
        @click="pick('armor')"
      >
        Armor
      </button>
    </div>

    <div class="archive-frame">
      <ul class="archive-list">
        <li v-for="r in rows" :key="r.date">
          <NuxtLink :to="`/play/wynndle/archive/${r.date}-${mode}`" class="archive-row">
            <span class="archive-day">DAY {{ dayNumber(r.date) }}</span>
            <time class="archive-date">{{ r.date }}</time>
            <span class="archive-item" :style="{ color: rarityColor(r.itemRarity) }">
              {{ r.itemName }}
            </span>
            <span class="archive-result" :data-result="r.result ?? 'unknown'">
              <template v-if="r.result === 'solved'">
                Solved · {{ r.guesses }}/10
              </template>
              <template v-else-if="r.result === 'bested'">
                Bested · 10/10
              </template>
              <template v-else-if="r.result === 'missed'">
                Missed
              </template>
              <template v-else>
                View →
              </template>
            </span>
            <span v-if="r.hints" class="archive-hints">+{{ r.hints }} hint{{ r.hints === 1 ? '' : 's' }}</span>
          </NuxtLink>
        </li>
        <li v-if="!rows.length" class="archive-empty">
          Your archive starts after your first solve.
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.archive-page {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 0 64px;
  display: grid;
  gap: 20px;
}

.archive-header {
  text-align: center;
  display: grid;
  gap: 6px;
  padding: 18px 0;
}

.archive-kicker {
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

.archive-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4.5vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--paper-base);
  margin: 6px 0;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.3);
}

.archive-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: rgb(65 38 36 / 0.32);
  border: 2px solid var(--paper-bd);
  justify-self: center;
}

.archive-tab {
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

.archive-tab:hover {
  background: var(--paper-light);
}

.archive-tab.is-active {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
}

.archive-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.archive-frame {
  background: var(--paper-base);
  padding: 18px;
  box-shadow: var(--wood-shadow-medium);
}

.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 4px;
}

.archive-row {
  display: grid;
  grid-template-columns: 80px 110px minmax(0, 1.4fr) auto auto;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  background: var(--paper-light);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  text-decoration: none;
  transition: background-color 0.12s ease-out;
}

.archive-row:hover {
  background: rgb(228 214 152);
}

.archive-row:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.archive-day {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--paper-text);
  font-weight: 600;
}

.archive-date {
  font-family: var(--font-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--paper-text);
  opacity: 0.78;
}

.archive-item {
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1;
  letter-spacing: -0.01em;
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.5);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-result {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 10px;
  border: 2px solid var(--paper-bd);
  background: var(--paper-base);
  white-space: nowrap;
}

.archive-result[data-result='solved'] {
  background: var(--element-valid);
  color: rgb(255 255 255);
  border-color: var(--element-valid-sub);
}

.archive-result[data-result='bested'] {
  background: var(--element-danger);
  color: rgb(255 255 255);
  border-color: var(--element-danger-sub);
}

.archive-result[data-result='missed'] {
  color: var(--paper-text);
  opacity: 0.6;
}

.archive-hints {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--paper-text);
  opacity: 0.65;
}

.archive-empty {
  padding: 36px 16px;
  text-align: center;
  font-family: var(--font-body);
  color: var(--paper-text);
  background: rgb(65 38 36 / 0.06);
  border: 2px dashed var(--paper-bd);
}

@media (max-width: 720px) {
  .archive-page {
    padding: 14px 0 96px;
    gap: 14px;
  }

  .archive-frame {
    padding: 10px;
  }

  .archive-row {
    grid-template-columns: 70px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 6px 12px;
    padding: 10px 12px;
  }

  .archive-day {
    grid-column: 1;
    grid-row: 1;
  }

  .archive-date {
    grid-column: 1;
    grid-row: 2;
  }

  .archive-item {
    grid-column: 2;
    grid-row: 1 / 3;
    font-size: 14px;
  }

  .archive-result {
    grid-column: 3;
    grid-row: 1 / 3;
    align-self: center;
  }

  .archive-hints {
    display: none;
  }
}
</style>
