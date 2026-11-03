<script setup lang="ts">
import type { SearchTome } from '~/lib/items-search/types'

defineProps<{ tome: SearchTome }>()
</script>

<template>
  <TooltipExport :name="tome.displayName" class="card-wrap">
    <div class="card-link">
      <TomeTooltip :tome="tome" />
    </div>
  </TooltipExport>
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
