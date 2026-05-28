<script setup lang="ts">
import type { ItemCriteria } from '~/lib/items-search/types'

const props = defineProps<{ majorIdOptions?: string[], setOptions?: string[] }>()
const criteria = defineModel<ItemCriteria>({ required: true })

const majorIds = computed(() => props.majorIdOptions ?? [])
const sets = computed(() => props.setOptions ?? [])
const availableSets = computed(() => sets.value.filter(s => !criteria.value.sets.includes(s)))

const TYPES = ['helmet', 'chestplate', 'leggings', 'boots', 'ring', 'bracelet', 'necklace', 'bow', 'spear', 'wand', 'dagger', 'relik']
const TIERS = ['Normal', 'Unique', 'Rare', 'Legendary', 'Fabled', 'Mythic']
const RESTRICTIONS = [['untradable', 'Untradable'], ['quest', 'Quest Item']] as const

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

function addSet(e: Event): void {
  const target = e.target as HTMLSelectElement
  const v = target.value
  if (!v)
    return
  if (!criteria.value.sets.includes(v))
    criteria.value = { ...criteria.value, sets: [...criteria.value.sets, v] }
  target.value = ''
}

function removeSet(name: string): void {
  criteria.value = { ...criteria.value, sets: criteria.value.sets.filter(s => s !== name) }
}
</script>

<template>
  <div class="filters">
    <input
      :value="criteria.name"
      class="f-input"
      type="text"
      placeholder="Item name…"
      @input="criteria = { ...criteria, name: ($event.target as HTMLInputElement).value }"
    >

    <fieldset class="f-group">
      <legend>Type</legend>
      <button
        v-for="t in TYPES" :key="t" type="button"
        :class="{ on: criteria.types.includes(t) }"
        @click="criteria = { ...criteria, types: toggle(criteria.types, t) }"
      >
        {{ t }}
      </button>
    </fieldset>

    <fieldset class="f-group">
      <legend>Rarity</legend>
      <button
        v-for="t in TIERS" :key="t" type="button"
        :class="{ on: criteria.tiers.includes(t) }"
        @click="criteria = { ...criteria, tiers: toggle(criteria.tiers, t) }"
      >
        {{ t }}
      </button>
    </fieldset>

    <fieldset class="f-group">
      <legend>Level</legend>
      <input
        class="f-num" type="number" min="1" max="110" :value="criteria.levelRange[0]"
        @input="criteria = { ...criteria, levelRange: [Number(($event.target as HTMLInputElement).value) || 1, criteria.levelRange[1]] }"
      >
      <span>–</span>
      <input
        class="f-num" type="number" min="1" max="110" :value="criteria.levelRange[1]"
        @input="criteria = { ...criteria, levelRange: [criteria.levelRange[0], Number(($event.target as HTMLInputElement).value) || 110] }"
      >
    </fieldset>

    <fieldset class="f-group">
      <legend>Restriction</legend>
      <button
        v-for="[val, lbl] in RESTRICTIONS" :key="val" type="button"
        :class="{ on: criteria.restrictions.includes(val) }"
        @click="criteria = { ...criteria, restrictions: toggle(criteria.restrictions, val) }"
      >
        {{ lbl }}
      </button>
    </fieldset>

    <fieldset v-if="sets.length" class="f-group f-group--col">
      <legend>Set</legend>
      <div v-if="criteria.sets.length" class="f-chips">
        <button
          v-for="s in criteria.sets" :key="s" type="button"
          class="f-chip" :title="`Remove ${s}`"
          @click="removeSet(s)"
        >
          {{ s }} <span aria-hidden="true">×</span>
        </button>
      </div>
      <select
        v-if="availableSets.length"
        class="f-select"
        value=""
        @change="addSet"
      >
        <option value="">
          {{ criteria.sets.length ? 'Add another set…' : 'Any set…' }}
        </option>
        <option v-for="s in availableSets" :key="s" :value="s">
          {{ s }}
        </option>
      </select>
    </fieldset>

    <fieldset v-if="majorIds.length" class="f-group f-group--col">
      <legend>Major ID</legend>
      <select
        class="f-select"
        :value="criteria.majorId ?? ''"
        @change="criteria = { ...criteria, majorId: ($event.target as HTMLSelectElement).value || null }"
      >
        <option value="">
          Any
        </option>
        <option v-for="m in majorIds" :key="m" :value="m">
          {{ m }}
        </option>
      </select>
    </fieldset>

    <fieldset class="f-group f-group--col">
      <legend>Identifications</legend>
      <IdentificationFilterList
        :model-value="{ identifications: criteria.identifications, idSorts: criteria.idSorts }"
        @update:model-value="criteria = { ...criteria, identifications: $event.identifications, idSorts: $event.idSorts }"
      />
    </fieldset>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 0;
}
.f-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--color-text);
  font-size: 13px;
  width: 100%;
  transition: border-color 0.12s ease-out;
}
.f-input::placeholder {
  color: var(--color-muted);
}
.f-input:focus-visible,
.f-select:focus-visible,
.f-num:focus-visible {
  outline: none;
  border-color: var(--color-accent);
}
.f-select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--color-text);
  font-size: 12px;
  transition: border-color 0.12s ease-out;
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
  font: 500 11px/1 var(--font-mono);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
  padding: 0;
}
.f-group button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  font-size: 12px;
  padding: 4px 9px;
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
.f-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.f-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: oklch(65% 0.15 48 / 0.08);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s ease-out;
}
.f-chip:hover {
  background: oklch(65% 0.15 48 / 0.16);
}
.f-chip span {
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1;
}
.f-chip:hover span {
  color: var(--color-text);
}
.f-num {
  width: 68px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 8px;
  color: var(--color-text);
  font: 500 12px/1 var(--font-mono);
  transition: border-color 0.12s ease-out;
}
</style>
