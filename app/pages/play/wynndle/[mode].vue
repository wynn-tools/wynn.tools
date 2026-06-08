<script setup lang="ts">
import type { WynndleMode } from '~/lib/wynndle/types'
import GameBoard from '~/components/Wynndle/GameBoard.vue'
import { useWynndle } from '~/composables/useWynndle'

definePageMeta({
  layout: 'play',
  pageTransition: { name: 'play-fade', mode: 'out-in' },
})

const route = useRoute()
const modeParam = computed(() => {
  const raw = (route.params as Record<string, string | string[]>).mode
  return Array.isArray(raw) ? raw[0] : raw
})
if (modeParam.value !== 'weapon' && modeParam.value !== 'armor')
  throw createError({ statusCode: 404, statusMessage: 'Unknown mode' })
const mode = modeParam.value as WynndleMode

const { puzzle, round, status, submitGuess, revealHint, refresh } = useWynndle(mode)
onMounted(refresh)
const busy = computed(() => status.value === 'submitting')

useSeoMeta({
  title: () => `Wynndle ${mode === 'weapon' ? 'Weapon' : 'Armor'} · wynn.tools`,
})
</script>

<template>
  <div class="mode-page">
    <GameBoard v-if="puzzle" :puzzle="puzzle" :round="round" :mode="mode" :busy="busy" @submit="submitGuess" @hint="revealHint" />
    <div v-else class="loading">
      <span class="loading-text">Loading puzzle…</span>
    </div>
  </div>
</template>

<style scoped>
.mode-page {
  display: block;
}

.loading {
  max-width: 1100px;
  margin: 0 auto;
  padding: 60px 24px;
  text-align: center;
}

.loading-text {
  display: inline-block;
  padding: 14px 26px;
  background: var(--paper-base);
  color: var(--paper-text);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  box-shadow: var(--wood-shadow-medium);
}
</style>
