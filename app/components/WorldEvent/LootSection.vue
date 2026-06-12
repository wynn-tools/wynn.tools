<script setup lang="ts">
import type { ResolvedDrop } from '~/lib/world-events/types'

defineProps<{ label: string, drops: ResolvedDrop[] }>()
</script>

<template>
  <section v-if="drops.length" class="loot-section">
    <h3 class="kicker">
      {{ label }}
    </h3>
    <div class="chips">
      <ItemChip
        v-for="(d, i) in drops"
        :key="`${d.name}-${i}`"
        :name="d.name"
        :item="d.item"
        :ingredient="d.ingredient"
        :note="d.note ?? null"
      />
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
