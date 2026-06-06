<script setup lang="ts">
import type { MaterialCriteria } from '~/lib/items-search/types'

const criteria = defineModel<MaterialCriteria>({ required: true })

const SUBTYPES = ['mining', 'farming', 'fishing', 'woodcutting']

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
      <legend>Gathering</legend>
      <button
        v-for="s in SUBTYPES" :key="s" type="button"
        :class="{ on: criteria.subTypes.includes(s) }"
        @click="criteria = { ...criteria, subTypes: toggleStr(criteria.subTypes, s) }"
      >
        {{ s }}
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
</style>
