<script setup lang="ts">
import type { AtkSpeed } from '~/lib/crafter/types'
import { computed } from 'vue'
import { useCraftStore } from '~/stores/craft'

const store = useCraftStore()

const TIERS = [1, 2, 3] as const
const ATK_SPEEDS: readonly AtkSpeed[] = ['SLOW', 'NORMAL', 'FAST'] as const

// TODO: surface real material display names once the ingredient/material
// catalogue exposes a name-by-item-key lookup. For now, recipe.materials[i].item
// is an opaque identifier string, so we use generic "Material 1/2" labels.
const matTiers = computed(() => store.raw.matTiers)
const atkSpd = computed(() => store.raw.atkSpdOverride)

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
  <section class="material-panel">
    <header class="material-panel__header">
      <span class="kicker">Materials</span>
    </header>

    <div class="material-panel__rows">
      <div v-for="slot in [0, 1] as const" :key="slot" class="row">
        <span class="row__label">Material {{ slot + 1 }}</span>
        <div class="toggle-group" role="group" :aria-label="`Material ${slot + 1} tier`">
          <button
            v-for="tier in TIERS"
            :key="tier"
            type="button"
            class="toggle"
            :class="{ 'toggle--active': matTiers[slot] === tier }"
            :aria-pressed="matTiers[slot] === tier"
            @click="selectTier(slot, tier)"
          >
            {{ tier }}
          </button>
        </div>
      </div>

      <div v-if="store.isWeapon" class="row row--atkspd">
        <span class="row__label">Attack speed</span>
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
    </div>
  </section>
</template>

<style scoped>
.material-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  font-family: 'wynn-default', system-ui, sans-serif;
}

.material-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.material-panel__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.row__label {
  font-size: 12px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}

.row--atkspd {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--color-border);
}

.toggle-group {
  display: inline-flex;
  gap: 4px;
}

.toggle {
  min-width: 32px;
  padding: 4px 10px;
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
  min-width: 60px;
  letter-spacing: 0.04em;
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
