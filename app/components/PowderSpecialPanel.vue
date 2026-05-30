<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deserializePowderActive,
  POWDER_SPECIALS,
  powderActiveIsEmpty,
  serializePowderActive,
  tierReadout,
} from '~/lib/math/powder-specials'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const route = useRoute()
const router = useRouter()

const ELEMENTS = [
  { label: 'Earth', color: 'var(--color-elem-earth)' },
  { label: 'Thunder', color: 'var(--color-elem-thunder)' },
  { label: 'Water', color: 'var(--color-elem-water)' },
  { label: 'Fire', color: 'var(--color-elem-fire)' },
  { label: 'Air', color: 'var(--color-elem-air)' },
]
const TIERS = [1, 2, 3, 4, 5, 6, 7]

// Selected tab; default to the first element with an active tier, else Earth.
const selected = ref(0)
function defaultTab(): number {
  const idx = store.powderActive.findIndex(t => t > 0)
  return idx >= 0 ? idx : 0
}

const special = computed(() => POWDER_SPECIALS[selected.value]!)
const activeTier = computed(() => store.powderActive[selected.value] ?? 0)
const readout = computed(() => tierReadout(selected.value, activeTier.value))

function tierHasSelection(i: number) {
  return (store.powderActive[i] ?? 0) > 0
}

function pickTier(tier: number) {
  // Clicking the active tier turns it off.
  store.setPowderTier(selected.value, activeTier.value === tier ? 0 : tier)
}

function onPassive(e: Event) {
  store.setElemDmg(
    selected.value,
    Number.parseFloat((e.target as HTMLInputElement).value) || 0,
  )
}

function queryStr(key: string): string | null {
  const v = route.query[key]
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? null : null
}

// Mirror active tiers → URL query (param `psa`).
watch(
  () => store.powderActive,
  (a) => {
    const psa = serializePowderActive(a)
    const query = { ...route.query }
    if (psa)
      query.psa = psa
    else
      delete query.psa
    router.replace({ query })
  },
)

// Hydrate from URL on mount and on build-hash change (stable page key).
function syncFromQuery() {
  store.setPowderActive(deserializePowderActive(queryStr('psa')))
  selected.value = defaultTab()
}
onMounted(syncFromQuery)
watch(() => route.params.hash, syncFromQuery)
</script>

<template>
  <section class="ps">
    <header class="ps-head">
      <span class="kicker">Powder Specials</span>
      <button
        v-if="!powderActiveIsEmpty(store.powderActive)"
        type="button"
        class="ps-reset"
        @click="store.resetPowderActive()"
      >
        Reset
      </button>
    </header>

    <div class="tabs ps-tabs" role="tablist">
      <button
        v-for="(el, i) in ELEMENTS"
        :key="el.label"
        type="button"
        role="tab"
        :class="{ on: selected === i }"
        :aria-selected="selected === i"
        @click="selected = i"
      >
        <span class="ps-dot" :style="{ background: el.color }" />
        {{ el.label }}
        <span v-if="tierHasSelection(i) && selected !== i" class="ps-mark" />
      </button>
    </div>

    <div class="ps-active">
      <span class="ps-sub">Active — {{ special.weaponName }}</span>
      <div class="ps-tiers">
        <button
          type="button"
          class="ps-tier"
          :class="{ 'ps-tier--on': activeTier === 0 }"
          @click="store.setPowderTier(selected, 0)"
        >
          Off
        </button>
        <button
          v-for="t in TIERS"
          :key="t"
          type="button"
          class="ps-tier"
          :class="{ 'ps-tier--on': activeTier === t }"
          @click="pickTier(t)"
        >
          {{ t }}
        </button>
      </div>
      <span class="ps-readout">{{ readout || '—' }}</span>
    </div>

    <div class="ps-passive">
      <span class="ps-sub">Passive — {{ special.passiveName }}</span>
      <label class="ps-slider">
        <span
          class="ps-slider-name"
          :style="{ color: ELEMENTS[selected]!.color }"
        >
          {{ ELEMENTS[selected]!.label }} dmg boost
        </span>
        <input
          type="range"
          min="0"
          :max="special.cap"
          step="1"
          :value="store.boosts.elemDmg[selected]"
          @input="onPassive"
        >
        <span class="ps-slider-val mono">{{ store.boosts.elemDmg[selected] }}%</span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.ps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.ps-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.ps-reset {
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
.ps-reset:hover {
  color: var(--color-copper);
}
.ps-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ps-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex-shrink: 0;
}
.ps-mark {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--color-accent);
}
.ps-active,
.ps-passive {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ps-sub {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.ps-tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ps-tier {
  min-width: 28px;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: color-mix(in oklch, var(--color-bg) 40%, transparent);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s,
    background 0.12s;
}
.ps-tier:hover {
  border-color: var(--color-accent-dim);
  color: var(--color-text);
}
.ps-tier--on {
  background: color-mix(in oklch, var(--color-copper) 18%, transparent);
  border-color: var(--color-copper);
  color: var(--color-copper);
}
.ps-readout {
  font-size: 11px;
  color: var(--color-faint);
}
.ps-slider {
  display: grid;
  grid-template-columns: 1fr 2.75rem;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.ps-slider-name {
  font-weight: 600;
  grid-column: 1 / -1;
}
.ps-slider input {
  width: 100%;
  accent-color: var(--color-copper);
}
.ps-slider-val {
  text-align: right;
  font-size: 11px;
  color: var(--color-faint);
}
.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}
</style>
