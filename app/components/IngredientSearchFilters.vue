<script setup lang="ts">
import type { IngredientCriteria } from '~/lib/items-search/types'

const criteria = defineModel<IngredientCriteria>({ required: true })
const TIERS = [0, 1, 2, 3]
const SKILLS = ['woodworking', 'weaponsmithing', 'armouring', 'tailoring', 'jeweling', 'cooking', 'alchemism', 'scribing']

function toggleNum(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}
function toggleStr(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}
</script>

<template>
  <div class="filters">
    <input
      :value="criteria.name" class="f-input" type="text" placeholder="Ingredient name…"
      @input="criteria = { ...criteria, name: ($event.target as HTMLInputElement).value }"
    >
    <fieldset class="f-group">
      <legend>Tier</legend>
      <button
        v-for="t in TIERS" :key="t" type="button" :class="{ on: criteria.tiers.includes(t) }"
        @click="criteria = { ...criteria, tiers: toggleNum(criteria.tiers, t) }"
      >
        {{ t }}
      </button>
    </fieldset>
    <fieldset class="f-group">
      <legend>Level</legend>
      <input
        class="f-num" type="number" min="1" max="110" :value="criteria.levelRange[0]"
        @input="criteria = { ...criteria, levelRange: [Number(($event.target as HTMLInputElement).value), criteria.levelRange[1]] }"
      >
      <span>–</span>
      <input
        class="f-num" type="number" min="1" max="110" :value="criteria.levelRange[1]"
        @input="criteria = { ...criteria, levelRange: [criteria.levelRange[0], Number(($event.target as HTMLInputElement).value)] }"
      >
    </fieldset>
    <fieldset class="f-group">
      <legend>Skills</legend>
      <button
        v-for="s in SKILLS" :key="s" type="button" :class="{ on: criteria.skills.includes(s) }"
        @click="criteria = { ...criteria, skills: toggleStr(criteria.skills, s) }"
      >
        {{ s }}
      </button>
    </fieldset>
    <fieldset class="f-group f-group--col">
      <legend>Identifications</legend>
      <IdentificationFilterList
        :identifications="criteria.identifications" :id-sorts="criteria.idSorts"
        @update:identifications="criteria = { ...criteria, identifications: $event }"
        @update:id-sorts="criteria = { ...criteria, idSorts: $event }"
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
