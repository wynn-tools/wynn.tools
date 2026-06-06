<script setup lang="ts">
import type { IngredientCriteria } from '~/lib/items-search/types'

const criteria = defineModel<IngredientCriteria>({ required: true })

const constraintsModel = computed({
  get: () => criteria.value.constraints,
  set: (v) => { criteria.value = { ...criteria.value, constraints: v } },
})
const rollBasis = computed({
  get: () => criteria.value.rollBasis,
  set: (v) => { criteria.value = { ...criteria.value, rollBasis: v } },
})
const focusKey = ref<string | null>(null)

const INGREDIENT_QUICK_CODES = ['rawStrength', 'rawDexterity', 'rawIntelligence', 'rawDefence', 'rawAgility', 'rawSpellDamage', 'manaRegen', 'walkSpeed'] as const

const TIERS = [0, 1, 2, 3]
const SKILLS = ['woodworking', 'weaponsmithing', 'armouring', 'tailoring', 'jeweling', 'cooking', 'alchemism', 'scribing']

const levelRange = computed({
  get: (): [number, number] => criteria.value.levelRange,
  set: (v: number[]) => { criteria.value = { ...criteria.value, levelRange: v as [number, number] } },
})

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
    <input
      :value="criteria.mob" class="f-input" type="text" placeholder="Mob name…"
      @input="criteria = { ...criteria, mob: ($event.target as HTMLInputElement).value }"
    >
    <fieldset class="f-group f-group--col f-group--ids">
      <legend>Identifications</legend>
      <ItemRollBasisToggle v-model="rollBasis" />
      <ItemQuickAddChips v-model="constraintsModel" :codes="INGREDIENT_QUICK_CODES" @focus-key="focusKey = $event" />
      <ItemActiveConstraints v-model="constraintsModel" :focus-key="focusKey" />
      <ItemAdvancedExpression v-model="constraintsModel" />
      <IdentificationFilterList
        :model-value="{ constraints: constraintsModel }"
        @update:model-value="constraintsModel = $event.constraints"
      />
    </fieldset>
    <fieldset class="f-group">
      <legend>Tier</legend>
      <button
        v-for="t in TIERS" :key="t" type="button" :class="{ on: criteria.tiers.includes(t) }"
        @click="criteria = { ...criteria, tiers: toggleNum(criteria.tiers, t) }"
      >
        {{ t }}
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
    <fieldset class="f-group">
      <legend>Skills</legend>
      <button
        v-for="s in SKILLS" :key="s" type="button" :class="{ on: criteria.skills.includes(s) }"
        @click="criteria = { ...criteria, skills: toggleStr(criteria.skills, s) }"
      >
        {{ s }}
      </button>
    </fieldset>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
