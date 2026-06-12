<script setup lang="ts">
import type { JoinedWorldEvent, WorldEventFilter } from '~/lib/world-events/types'
import { computed } from 'vue'

const props = defineProps<{ modelValue: WorldEventFilter, events: JoinedWorldEvent[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: WorldEventFilter): void }>()

function update<K extends keyof WorldEventFilter>(key: K, val: WorldEventFilter[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: val })
}
function toggleArr<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
}

const regions = computed(() => Array.from(new Set(props.events.flatMap(j => j.loot ? [j.loot.region] : []))).sort())
const ingredientNames = computed(() => Array.from(new Set(props.events.flatMap((j) => {
  if (!j.loot)
    return []
  return [...j.loot.drops.commonIngredients, ...j.loot.drops.possibleIngredients, ...j.loot.drops.exclusiveIngredients]
}))).sort())
const itemNames = computed(() => Array.from(new Set(props.events.flatMap((j) => {
  if (!j.loot)
    return []
  return [...j.loot.drops.exclusiveItems, ...j.loot.drops.rareRandomLoots.map(r => r.name)]
}))).sort())

const DIFFS = ['EASY', 'MEDIUM', 'HARD'] as const
const LENS = ['SHORT', 'MEDIUM', 'LONG'] as const
</script>

<template>
  <div class="filters">
    <input
      class="f-input"
      type="search"
      :value="modelValue.search"
      placeholder="Search events…"
      aria-label="Search events"
      @input="e => update('search', (e.target as HTMLInputElement).value)"
    >

    <fieldset class="f-group">
      <legend>Difficulty</legend>
      <button v-for="d in DIFFS" :key="d" type="button" :class="{ on: modelValue.difficulties.includes(d) }" @click="update('difficulties', toggleArr(modelValue.difficulties, d))">
        {{ d.toLowerCase() }}
      </button>
    </fieldset>

    <fieldset class="f-group">
      <legend>Length</legend>
      <button v-for="l in LENS" :key="l" type="button" :class="{ on: modelValue.lengths.includes(l) }" @click="update('lengths', toggleArr(modelValue.lengths, l))">
        {{ l.toLowerCase() }}
      </button>
    </fieldset>

    <fieldset class="f-group f-group--col">
      <legend>
        Level
        <span class="f-range-val">{{ modelValue.levelMin }}–{{ modelValue.levelMax }}</span>
      </legend>
      <div class="lv-range">
        <input
          class="f-input lv-input"
          type="number"
          min="1"
          max="110"
          :value="modelValue.levelMin"
          aria-label="Minimum level"
          @input="e => update('levelMin', Number((e.target as HTMLInputElement).value))"
        >
        <span aria-hidden="true">–</span>
        <input
          class="f-input lv-input"
          type="number"
          min="1"
          max="110"
          :value="modelValue.levelMax"
          aria-label="Maximum level"
          @input="e => update('levelMax', Number((e.target as HTMLInputElement).value))"
        >
      </div>
    </fieldset>

    <fieldset v-if="regions.length" class="f-group">
      <legend>Region</legend>
      <button v-for="r in regions" :key="r" type="button" :class="{ on: modelValue.regions.includes(r) }" @click="update('regions', toggleArr(modelValue.regions, r))">
        {{ r }}
      </button>
    </fieldset>

    <fieldset class="f-group f-group--col">
      <legend>Drops ingredient</legend>
      <input
        class="f-input"
        list="we-ingredients"
        :value="modelValue.dropsIngredient ?? ''"
        placeholder="Any ingredient"
        @input="e => update('dropsIngredient', (e.target as HTMLInputElement).value || null)"
      >
      <datalist id="we-ingredients">
        <option v-for="n in ingredientNames" :key="n" :value="n" />
      </datalist>
    </fieldset>

    <fieldset class="f-group f-group--col">
      <legend>Drops exclusive item</legend>
      <input
        class="f-input"
        list="we-items"
        :value="modelValue.dropsExclusiveItem ?? ''"
        placeholder="Any exclusive"
        @input="e => update('dropsExclusiveItem', (e.target as HTMLInputElement).value || null)"
      >
      <datalist id="we-items">
        <option v-for="n in itemNames" :key="n" :value="n" />
      </datalist>
    </fieldset>

    <label class="live-toggle">
      <input
        type="checkbox"
        :checked="modelValue.hasSchedule"
        @change="e => update('hasSchedule', (e.target as HTMLInputElement).checked)"
      >
      <span>Live schedule only</span>
    </label>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.lv-range {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lv-input {
  width: 72px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.live-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  cursor: pointer;
}
.live-toggle input {
  accent-color: var(--color-accent);
}
.live-toggle:hover {
  color: var(--color-text);
}
</style>
