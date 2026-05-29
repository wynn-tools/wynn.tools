<script setup lang="ts">
import type { TomeCriteria } from '~/lib/items-search/types'
import { TIER_COLORS } from '~/lib/items/tooltip'

function tierColor(tier: string): string {
  const key = tier.charAt(0).toUpperCase() + tier.slice(1)
  return TIER_COLORS[key] ?? TIER_COLORS.Normal!
}

const criteria = defineModel<TomeCriteria>({ required: true })

const TYPES = [
  ['weapon_tome', 'Weapon'],
  ['armour_tome', 'Armour'],
  ['guild_tome', 'Guild'],
  ['lootrun_tome', 'Lootrun'],
  ['mysticism_tome', 'Mysticism'],
  ['marathon_tome', 'Marathon'],
  ['expertise_tome', 'Expertise'],
] as const

const TIERS = ['common', 'unique', 'rare', 'legendary', 'fabled', 'mythic']

const SOURCES = [
  ['raid', 'Raid'],
  ['guild', 'Guild'],
  ['lootrun', 'Lootrun'],
  ['none', 'No source'],
] as const

const levelRange = computed({
  get: (): [number, number] => criteria.value.levelRange,
  set: (v: number[]) => { criteria.value = { ...criteria.value, levelRange: v as [number, number] } },
})

function toggleStr(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}
</script>

<template>
  <div class="filters">
    <input
      :value="criteria.name" class="f-input" type="text" placeholder="Tome name…"
      @input="criteria = { ...criteria, name: ($event.target as HTMLInputElement).value }"
    >
    <fieldset class="f-group">
      <legend>Type</legend>
      <button
        v-for="[val, label] in TYPES" :key="val" type="button"
        :class="{ on: criteria.types.includes(val) }"
        @click="criteria = { ...criteria, types: toggleStr(criteria.types, val) }"
      >
        {{ label }}
      </button>
    </fieldset>
    <fieldset class="f-group f-group--tier">
      <legend>Tier</legend>
      <button
        v-for="t in TIERS" :key="t" type="button"
        :class="{ on: criteria.tiers.includes(t) }"
        :style="{ '--tier-color': tierColor(t) }"
        @click="criteria = { ...criteria, tiers: toggleStr(criteria.tiers, t) }"
      >
        {{ t }}
      </button>
    </fieldset>
    <fieldset class="f-group">
      <legend>Drop source</legend>
      <button
        v-for="[val, label] in SOURCES" :key="val" type="button"
        :class="{ on: criteria.sources.includes(val) }"
        @click="criteria = { ...criteria, sources: toggleStr(criteria.sources, val) }"
      >
        {{ label }}
      </button>
    </fieldset>
    <fieldset class="f-group f-group--col">
      <legend>
        Level
        <span class="f-range-val">{{ criteria.levelRange[0] }}–{{ criteria.levelRange[1] }}</span>
      </legend>
      <SliderRoot
        v-model="levelRange"
        :min="1"
        :max="120"
        :step="1"
        class="f-slider"
      >
        <SliderTrack class="f-slider-track">
          <SliderRange class="f-slider-range" />
        </SliderTrack>
        <SliderThumb v-for="_ in 2" :key="_" class="f-slider-thumb" />
      </SliderRoot>
    </fieldset>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.f-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--color-text);
  font-size: 13px;
  transition: border-color 0.12s ease-out;
}
.f-input::placeholder {
  color: var(--color-muted);
}
.f-input:focus-visible {
  outline: none;
  border-color: var(--color-accent);
}
.f-group {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.f-group--col {
  flex-direction: column;
  align-items: stretch;
}
.f-group legend {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  font: 500 11px/1 var(--font-mono);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
  padding: 0;
}
.f-range-val {
  font: 500 11px/1 var(--font-mono);
  color: var(--color-accent);
  text-transform: none;
  letter-spacing: 0.04em;
  margin-left: auto;
}
.f-group button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  text-transform: capitalize;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}
.f-group button:hover {
  color: var(--color-text);
  border-color: var(--color-faint);
}
.f-group button.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: oklch(65% 0.15 48 / 0.08);
}
.f-group button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.f-group--tier button:hover {
  color: var(--tier-color);
  border-color: color-mix(in oklch, var(--tier-color) 45%, var(--color-border));
}

.f-group--tier button.on {
  color: var(--tier-color);
  border-color: var(--tier-color);
  background: color-mix(in oklch, var(--tier-color) 12%, transparent);
}

.f-group--tier button:focus-visible {
  outline-color: var(--tier-color);
}

.f-slider {
  position: relative;
  display: flex;
  width: 100%;
  touch-action: none;
  user-select: none;
  align-items: center;
  padding-block: 6px;
}
.f-slider-track {
  position: relative;
  height: 4px;
  width: 100%;
  flex-grow: 1;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--color-border);
}
.f-slider-range {
  position: absolute;
  height: 100%;
  background: oklch(65% 0.15 48 / 0.7);
}
.f-slider-thumb {
  display: block;
  height: 14px;
  width: 14px;
  border-radius: 9999px;
  border: 1px solid oklch(65% 0.15 48 / 0.6);
  background: var(--color-bg);
  box-shadow: 0 1px 4px oklch(0% 0 0 / 0.3);
  transition: border-color 0.12s ease-out;
  cursor: grab;
}
.f-slider-thumb:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px oklch(65% 0.15 48 / 0.5);
  border-color: var(--color-accent);
}
.f-slider-thumb:active {
  cursor: grabbing;
}

@media (max-width: 720px) {
  .f-input {
    padding: 10px 12px;
    font-size: 14px;
    min-height: 40px;
  }
  .f-group button {
    padding: 8px 12px;
    font-size: 13px;
    min-height: 34px;
  }
  .f-slider {
    padding-block: 12px;
  }
  .f-slider-thumb {
    height: 20px;
    width: 20px;
  }
}
</style>
