<script setup lang="ts">
import type { ItemCriteria } from '~/lib/items-search/types'

const props = defineProps<{ majorIdOptions?: string[] }>()
const criteria = defineModel<ItemCriteria>({ required: true })

const majorIds = computed(() => props.majorIdOptions ?? [])

const TYPES = ['helmet', 'chestplate', 'leggings', 'boots', 'ring', 'bracelet', 'necklace', 'bow', 'spear', 'wand', 'dagger', 'relik']
const TIERS = ['Normal', 'Unique', 'Rare', 'Legendary', 'Fabled', 'Mythic', 'Set', 'Crafted']
const RESTRICTIONS = [['untradable', 'Untradable'], ['quest', 'Quest Item']] as const

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
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
  gap: 16px;
}
.f-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--color-text);
  font-size: 13px;
}
.f-select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 8px;
  color: var(--color-text);
  font-size: 12px;
}
.f-group {
  border: none;
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
  font-size: 11px;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.f-group button {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  text-transform: capitalize;
}
.f-group button.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.f-num {
  width: 64px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 4px 6px;
  color: var(--color-text);
}
</style>
