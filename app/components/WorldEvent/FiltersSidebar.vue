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
  <aside class="sidebar">
    <label class="field">
      <span class="kicker">Search</span>
      <input :value="modelValue.search" placeholder="Event name…" @input="e => update('search', (e.target as HTMLInputElement).value)">
    </label>

    <div class="field">
      <span class="kicker">Region</span>
      <div class="chip-row">
        <button v-for="r in regions" :key="r" type="button" class="chip-toggle" :class="{ on: modelValue.regions.includes(r) }" @click="update('regions', toggleArr(modelValue.regions, r))">
          {{ r }}
        </button>
      </div>
    </div>

    <div class="field">
      <span class="kicker">Difficulty</span>
      <div class="chip-row">
        <button v-for="d in DIFFS" :key="d" type="button" class="chip-toggle" :class="{ on: modelValue.difficulties.includes(d) }" @click="update('difficulties', toggleArr(modelValue.difficulties, d))">
          {{ d }}
        </button>
      </div>
    </div>

    <div class="field">
      <span class="kicker">Length</span>
      <div class="chip-row">
        <button v-for="l in LENS" :key="l" type="button" class="chip-toggle" :class="{ on: modelValue.lengths.includes(l) }" @click="update('lengths', toggleArr(modelValue.lengths, l))">
          {{ l }}
        </button>
      </div>
    </div>

    <div class="field">
      <span class="kicker">Level</span>
      <div class="range">
        <input type="number" min="1" max="110" :value="modelValue.levelMin" @input="e => update('levelMin', Number((e.target as HTMLInputElement).value))">
        <span>–</span>
        <input type="number" min="1" max="110" :value="modelValue.levelMax" @input="e => update('levelMax', Number((e.target as HTMLInputElement).value))">
      </div>
    </div>

    <label class="field">
      <span class="kicker">Drops ingredient</span>
      <input list="we-ingredients" :value="modelValue.dropsIngredient ?? ''" placeholder="Any ingredient" @input="e => update('dropsIngredient', (e.target as HTMLInputElement).value || null)">
      <datalist id="we-ingredients">
        <option v-for="n in ingredientNames" :key="n" :value="n" />
      </datalist>
    </label>

    <label class="field">
      <span class="kicker">Drops exclusive item</span>
      <input list="we-items" :value="modelValue.dropsExclusiveItem ?? ''" placeholder="Any exclusive" @input="e => update('dropsExclusiveItem', (e.target as HTMLInputElement).value || null)">
      <datalist id="we-items">
        <option v-for="n in itemNames" :key="n" :value="n" />
      </datalist>
    </label>

    <label class="field field--inline">
      <input type="checkbox" :checked="modelValue.hasSchedule" @change="e => update('hasSchedule', (e.target as HTMLInputElement).checked)">
      <span>Has live schedule</span>
    </label>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.field input[type='text'],
.field input[type='number'],
.field input:not([type]),
.field input[list] {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  border-radius: 6px;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chip-toggle {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-muted);
  border-radius: 9999px;
  cursor: pointer;
  font-size: 12px;
}
.chip-toggle.on {
  background: var(--color-accent);
  color: var(--color-bg);
  border-color: var(--color-accent);
}
.range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.range input {
  width: 64px;
}
</style>
