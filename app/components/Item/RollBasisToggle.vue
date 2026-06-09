<script setup lang="ts">
import type { RollBasis } from '~/lib/items-search/roll-basis'

const model = defineModel<RollBasis>({ required: true })

const options = [
  { value: 'possible' as RollBasis, label: 'Possible' },
  { value: 'guaranteed' as RollBasis, label: 'Guaranteed' },
]
</script>

<template>
  <UiSegmented v-model="model" :options="options" role="radio" aria-label="Roll basis" />
</template>
