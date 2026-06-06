<script setup lang="ts">
import type { SearchCharm } from '~/lib/items-search/types'

defineProps<{ charm: SearchCharm }>()
</script>

<template>
  <div class="card-wrap">
    <div class="card-link">
      <CharmTooltip :charm="charm" />
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
