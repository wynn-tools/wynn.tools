<script setup lang="ts">
import type { ResolvedDrop } from '~/lib/world-events/types'
import DropChip from './DropChip.vue'

defineProps<{ label: string, drops: ResolvedDrop[] }>()
</script>

<template>
  <section v-if="drops.length" class="loot-section">
    <h3 class="kicker">
      {{ label }}
    </h3>
    <div class="chips">
      <DropChip v-for="(d, i) in drops" :key="`${d.name}-${i}`" :drop="d" />
    </div>
  </section>
</template>

<style scoped>
.loot-section + .loot-section {
  margin-top: 20px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
</style>
