<script setup lang="ts">
import type { SearchIngredient } from '~/lib/items-search/types'
import { itemIconUrl } from '~/lib/items/icon'

const props = defineProps<{ ingredient: SearchIngredient }>()
const icon = computed(() => itemIconUrl(props.ingredient))
</script>

<template>
  <div class="card">
    <img v-if="icon" :src="icon" class="card-icon" alt="" aria-hidden="true">
    <div class="card-body">
      <span class="card-name">{{ ingredient.displayName }}</span>
      <span class="card-meta">Tier {{ ingredient.tier }} · Lv. {{ ingredient.level }}</span>
      <span v-if="ingredient.skills.length" class="card-meta">{{ ingredient.skills.join(', ') }}</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
}
.card-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.card-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
}
.card-meta {
  font-size: 11px;
  color: var(--color-muted);
  text-transform: capitalize;
}
</style>
