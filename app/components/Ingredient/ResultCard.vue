<script setup lang="ts">
import type { SearchIngredient } from '~/lib/items-search/types'

defineProps<{ ingredient: SearchIngredient }>()
</script>

<template>
  <div class="card-wrap">
    <div class="card-link">
      <IngredientTooltip :ingredient="ingredient" />
    </div>
  </div>
</template>

<style scoped>
.card-wrap {
  position: relative;
  break-inside: avoid;
  margin-bottom: 12px;
  display: block;
}
.card-link {
  display: block;
  border-radius: 4px;
  zoom: 0.75;
}
</style>
