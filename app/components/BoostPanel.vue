<script setup lang="ts">
import type { BoostId } from '~/lib/math/boosts'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BOOST_ELEM_CAPS,
  boostsAreEmpty,
  deserializeBoosts,
  serializeBoosts,
} from '~/lib/math/boosts'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const route = useRoute()
const router = useRouter()

// Two groups. Radiance-family interacts with Judgement (Judgement forces the
// radiance scale to 1.4); the rest are cry/haunt buffs.
const RADIANCE_GROUP: { id: BoostId, label: string }[] = [
  { id: 'radiance', label: 'Radiance +15%' },
  { id: 'divinehonor', label: 'Divine Honor +5%' },
  { id: 'shine', label: 'Shine +5%' },
  { id: 'judgement', label: 'Judgement' },
]
const BUFF_GROUP: { id: BoostId, label: string }[] = [
  { id: 'warscream', label: 'War Scream' },
  { id: 'emboldeningcry', label: 'Emboldening Cry +8%' },
  { id: 'vengeful', label: 'Vengeful Spirit +20%' },
  { id: 'fortitude', label: 'Fortitude +40%' },
  { id: 'fanatic', label: 'Fanatic Haunt +15%' },
  { id: 'lunatic', label: 'Lunatic Haunt' },
]

const ELEMENTS: { label: string, color: string }[] = [
  { label: 'Earth', color: 'var(--color-elem-earth)' },
  { label: 'Thunder', color: 'var(--color-elem-thunder)' },
  { label: 'Water', color: 'var(--color-elem-water)' },
  { label: 'Fire', color: 'var(--color-elem-fire)' },
  { label: 'Air', color: 'var(--color-elem-air)' },
]

const anyActive = computed(() => !boostsAreEmpty(store.boosts))

function isActive(id: BoostId) {
  return store.boosts.toggles.has(id)
}

function queryStr(key: string): string | null {
  const v = route.query[key]
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? null : null
}

// Mirror store boosts → URL query (replace, preserving other params + the hash).
watch(
  () => store.boosts,
  (b) => {
    const { boosts, edmg } = serializeBoosts(b)
    const query = { ...route.query }
    if (boosts)
      query.boosts = boosts
    else
      delete query.boosts
    if (edmg)
      query.edmg = edmg
    else
      delete query.edmg
    router.replace({ query })
  },
  { deep: true },
)

// Hydrate store from URL on mount (shared links reproduce boosts).
onMounted(() => {
  const b = deserializeBoosts(queryStr('boosts'), queryStr('edmg'))
  if (!boostsAreEmpty(b))
    store.setBoosts(b)
})

function onSlider(i: number, e: Event) {
  store.setElemDmg(i, Number.parseFloat((e.target as HTMLInputElement).value) || 0)
}
</script>

<template>
  <section class="boost">
    <header class="boost-head">
      <span class="kicker">Active Boosts</span>
      <button v-if="anyActive" type="button" class="boost-reset" @click="store.resetBoosts()">
        Reset
      </button>
    </header>

    <div class="boost-group">
      <button
        v-for="b in RADIANCE_GROUP"
        :key="b.id"
        type="button"
        class="chip"
        :class="{ 'chip--on': isActive(b.id) }"
        @click="store.toggleBoost(b.id)"
      >
        {{ b.label }}
      </button>
    </div>

    <div class="boost-group">
      <button
        v-for="b in BUFF_GROUP"
        :key="b.id"
        type="button"
        class="chip"
        :class="{ 'chip--on': isActive(b.id) }"
        @click="store.toggleBoost(b.id)"
      >
        {{ b.label }}
      </button>
    </div>

    <div class="sliders">
      <span class="sliders-head">Manual damage %</span>
      <label v-for="(el, i) in ELEMENTS" :key="el.label" class="slider">
        <span class="slider-name" :style="{ color: el.color }">{{ el.label }}</span>
        <input
          type="range"
          min="0"
          :max="BOOST_ELEM_CAPS[i]"
          step="1"
          :value="store.boosts.elemDmg[i]"
          @input="onSlider(i, $event)"
        >
        <span class="slider-val mono">{{ store.boosts.elemDmg[i] }}%</span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.boost {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.boost-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.boost-reset {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.boost-reset:hover {
  color: var(--color-copper);
}
.boost-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in oklch, var(--color-bg) 40%, transparent);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s,
    background 0.12s;
}
.chip:hover {
  border-color: var(--color-accent-dim);
  color: var(--color-text);
}
.chip--on {
  background: color-mix(in oklch, var(--color-copper) 18%, transparent);
  border-color: var(--color-copper);
  color: var(--color-copper);
}
.sliders {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in oklch, var(--color-surface-hi) 60%, transparent);
}
.sliders-head {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.slider {
  display: grid;
  grid-template-columns: 4rem 1fr 2.75rem;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.slider-name {
  font-weight: 600;
}
.slider input {
  width: 100%;
  accent-color: var(--color-copper);
}
.slider-val {
  text-align: right;
  font-size: 11px;
  color: var(--color-faint);
}
.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}
</style>
