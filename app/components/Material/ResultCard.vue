<script setup lang="ts">
import type { SearchMaterial } from '~/lib/items-search/types'

defineProps<{ material: SearchMaterial }>()
</script>

<template>
  <div class="card-wrap">
    <div class="card-link">
      <MaterialTooltip :material="material" />
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
