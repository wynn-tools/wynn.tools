<script setup lang="ts">
import type { IdConstraint, StatSumPresetKey } from '~/lib/items-search/types'
import { STAT_SUM_PRESET_KEYS, STAT_SUM_PRESETS } from '~/lib/items-search/stat-sums'

const model = defineModel<IdConstraint[]>({ required: true })

const DEFAULTS: Record<StatSumPresetKey, number> = {
  spSum: 5,
  spellDmgTotal: 20,
  elemDmgTotal: 20,
  elemDefTotal: 20,
}

function isActive(p: StatSumPresetKey) {
  return model.value.some(c => c.kind === 'sum' && c.preset === p)
}

function toggle(p: StatSumPresetKey) {
  if (isActive(p))
    model.value = model.value.filter(c => !(c.kind === 'sum' && c.preset === p))
  else
    model.value = [...model.value, { kind: 'sum', preset: p, min: DEFAULTS[p] }]
}
</script>

<template>
  <div class="presets" role="group" aria-label="Stat sum presets">
    <button
      v-for="key in STAT_SUM_PRESET_KEYS" :key="key" type="button"
      :class="{ on: isActive(key) }"
      @click="toggle(key)"
    >
      {{ STAT_SUM_PRESETS[key].label }}
    </button>
  </div>
</template>

<style scoped>
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.presets button {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 5px 9px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s,
    background 0.12s;
}
.presets button:hover {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.presets button.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
.presets button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
