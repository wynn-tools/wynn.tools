<script setup lang="ts">
import type { ItemCriteria } from '~/lib/items-search/types'
import { spriteUrl } from '~/lib/items/icon'
import { TIER_COLORS } from '~/lib/items/tooltip'

const props = defineProps<{ majorIdOptions?: string[], setOptions?: string[] }>()
const criteria = defineModel<ItemCriteria>({ required: true })

const constraintsModel = computed({
  get: () => criteria.value.constraints,
  set: (v) => { criteria.value = { ...criteria.value, constraints: v } },
})
const rollBasis = computed({
  get: () => criteria.value.rollBasis,
  set: (v) => { criteria.value = { ...criteria.value, rollBasis: v } },
})
const focusKey = ref<string | null>(null)

const majorIds = computed(() => props.majorIdOptions ?? [])
const sets = computed(() => props.setOptions ?? [])
const availableSets = computed(() => sets.value.filter(s => !criteria.value.sets.includes(s)))

const TYPES = ['helmet', 'chestplate', 'leggings', 'boots', 'ring', 'bracelet', 'necklace', 'bow', 'spear', 'wand', 'dagger', 'relik']
const TIERS = ['Normal', 'Unique', 'Rare', 'Legendary', 'Fabled', 'Mythic']
const RESTRICTIONS = [['untradable', 'Untradable'], ['quest', 'Quest Item']] as const

const levelRange = computed({
  get: (): [number, number] => criteria.value.levelRange,
  set: (v: number[]) => { criteria.value = { ...criteria.value, levelRange: v as [number, number] } },
})

const majorIdModel = computed({
  get: () => criteria.value.majorId,
  set: (v: string | null) => { criteria.value = { ...criteria.value, majorId: v } },
})

const setAddModel = ref<string | null>(null)

watch(setAddModel, (v) => {
  if (!v)
    return
  if (!criteria.value.sets.includes(v))
    criteria.value = { ...criteria.value, sets: [...criteria.value.sets, v] }
  setAddModel.value = null
})

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
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

    <fieldset class="f-group f-group--type">
      <legend>Type</legend>
      <button
        v-for="t in TYPES" :key="t" type="button"
        :class="{ on: criteria.types.includes(t) }"
        @click="criteria = { ...criteria, types: toggle(criteria.types, t) }"
      >
        <img :src="spriteUrl(t)" class="type-icon" alt="" aria-hidden="true">
        {{ t }}
      </button>
    </fieldset>

    <fieldset class="f-group f-group--tier">
      <legend>Rarity</legend>
      <button
        v-for="t in TIERS" :key="t" type="button"
        :class="{ on: criteria.tiers.includes(t) }"
        :style="{ '--tier-color': TIER_COLORS[t] }"
        @click="criteria = { ...criteria, tiers: toggle(criteria.tiers, t) }"
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
      <FilterCombobox
        v-if="availableSets.length"
        v-model="setAddModel"
        :options="availableSets"
        :placeholder="criteria.sets.length ? 'Add another set…' : 'Any set…'"
      />
    </fieldset>

    <fieldset v-if="majorIds.length" class="f-group f-group--col">
      <legend>Major ID</legend>
      <FilterCombobox
        v-model="majorIdModel"
        :options="majorIds"
        placeholder="Any"
      />
    </fieldset>

    <fieldset class="f-group f-group--col f-group--ids">
      <legend>Identifications</legend>
      <ItemRollBasisToggle v-model="rollBasis" />
      <ItemQuickAddChips v-model="constraintsModel" @focus-key="focusKey = $event" />
      <ItemActiveConstraints v-model="constraintsModel" :focus-key="focusKey" />
      <ItemStatSumPresets v-model="constraintsModel" />
      <ItemAdvancedExpression v-model="constraintsModel" />
      <IdentificationFilterList
        :model-value="{ constraints: constraintsModel }"
        @update:model-value="constraintsModel = $event.constraints"
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

/* Slot order: name → Type → Identifications → Rarity → Level → Restriction → Set → Major ID. */
.filters > * {
  order: 5;
}
.f-input {
  order: 0;
}
.f-group--type {
  order: 1;
}
.f-group--ids {
  order: 2;
}
.f-group--tier {
  order: 3;
}
.f-input {
  width: 100%;
}

/* Type filter: sprite icon inline */
.f-group--type button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.type-icon {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  object-fit: contain;
  flex-shrink: 0;
}

/* Rarity filter: per-tier color via --tier-color */
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
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s ease-out;
}
.f-chip:hover {
  background: color-mix(in oklch, var(--color-accent) 16%, transparent);
}
.f-chip span {
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1;
}
.f-chip:hover span {
  color: var(--color-text);
}

@media (max-width: 720px) {
  .filters {
    gap: 18px;
  }
  .f-chip {
    padding: 6px 10px;
    font-size: 13px;
    min-height: 32px;
  }
}
</style>
