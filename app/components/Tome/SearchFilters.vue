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

/* Tier filter buttons: per-tier color via --tier-color */
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
</style>
