<script setup lang="ts">
import type { AtkSpeed } from '~/lib/crafter/types'
import { computed } from 'vue'
import { useCraftStore } from '~/stores/craft'

const store = useCraftStore()

const TIERS = [1, 2, 3] as const
const ATK_SPEEDS: readonly AtkSpeed[] = ['SLOW', 'NORMAL', 'FAST'] as const

const matTiers = computed(() => store.raw.matTiers)
const atkSpd = computed(() => store.raw.atkSpdOverride)

interface MaterialRow {
  label: string
  amount: number
}

const materials = computed<MaterialRow[]>(() => {
  const r = store.recipe
  if (!r)
    return []
  return r.materials.map((m) => {
    const raw = m.item
    const label = raw.startsWith('Refined ') ? raw.slice('Refined '.length) : raw
    return { label, amount: m.amount }
  })
})

function selectTier(slot: 0 | 1, tier: 1 | 2 | 3): void {
  store.setMatTier(slot, tier)
}

function selectAtkSpd(spd: AtkSpeed): void {
  // Clicking the already-selected speed clears the override back to the
  // recipe default (a small UX nicety over WynnBuilder).
  if (store.raw.atkSpdOverride === spd) {
    store.setAtkSpdOverride(null)
    return
  }
  store.setAtkSpdOverride(spd)
}

function atkSpdLabel(spd: AtkSpeed): string {
  return spd
}
</script>

<template>
  <section class="material-panel" aria-label="Materials">
    <div
      v-for="(m, slot) in materials"
      :key="slot"
      class="mat"
    >
      <span class="mat__amount">{{ m.amount }}×</span>
      <span class="mat__name">{{ m.label }}</span>
      <div class="toggle-group" role="group" :aria-label="`${m.label} tier`">
        <button
          v-for="tier in TIERS"
          :key="tier"
          type="button"
          class="toggle"
          :class="{ 'toggle--active': matTiers[slot as 0 | 1] === tier }"
          :aria-pressed="matTiers[slot as 0 | 1] === tier"
          @click="selectTier(slot as 0 | 1, tier)"
        >
          {{ tier }}
        </button>
      </div>
    </div>

    <div v-if="store.isWeapon" class="atkspd">
      <span class="atkspd__label">Atk</span>
      <div class="toggle-group" role="group" aria-label="Attack speed override">
        <button
          v-for="spd in ATK_SPEEDS"
          :key="spd"
          type="button"
          class="toggle toggle--wide"
          :class="{ 'toggle--active': atkSpd === spd }"
          :aria-pressed="atkSpd === spd"
          @click="selectAtkSpd(spd)"
        >
          {{ atkSpdLabel(spd) }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.material-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  font-family: 'wynn-default', system-ui, sans-serif;
  min-width: 0;
  flex: 1;
}

.mat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mat__amount {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-faint);
  letter-spacing: 0.04em;
}

.mat__name {
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.atkspd {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-left: 24px;
  border-left: 1px solid var(--color-border);
  align-self: center;
}

.atkspd__label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.toggle-group {
  display: inline-flex;
  gap: 4px;
}

.toggle {
  min-width: 28px;
  padding: 3px 9px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}

.toggle--wide {
  min-width: 56px;
  letter-spacing: 0.04em;
  font-size: 11px;
}

.toggle:hover {
  background: var(--color-surface-hi);
  border-color: var(--color-accent-dim);
}

.toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.toggle--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
}

.toggle--active:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
}
</style>
