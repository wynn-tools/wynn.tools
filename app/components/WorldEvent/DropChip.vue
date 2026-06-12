<script setup lang="ts">
import type { ResolvedDrop } from '~/lib/world-events/types'
import { computed } from 'vue'

const props = defineProps<{ drop: ResolvedDrop }>()

const stars = computed(() => {
  const t = props.drop.ingredient?.tier ?? 0
  return t > 0 ? '★'.repeat(t) : ''
})

const href = computed(() => {
  if (props.drop.ingredient)
    return `/items?ingredient=${encodeURIComponent(props.drop.name)}`
  if (props.drop.item)
    return `/items/${encodeURIComponent(props.drop.name)}`
  return null
})

const rarityClass = computed(() => props.drop.item?.rarity ? `chip--rarity-${props.drop.item.rarity}` : null)
</script>

<template>
  <NuxtLink
    v-if="href"
    :to="href"
    class="chip"
    :class="[rarityClass]"
    :title="drop.note ?? undefined"
  >
    <span v-if="stars" class="chip__stars">{{ stars }}</span>
    <span class="chip__name">{{ drop.name }}</span>
  </NuxtLink>
  <span v-else class="chip chip--unresolved" :title="drop.note ?? undefined">
    <span class="chip__name">{{ drop.name }}</span>
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  font-size: 13px;
}
.chip:hover {
  border-color: var(--color-accent);
}
.chip--unresolved {
  color: var(--color-muted);
}
.chip__stars {
  color: var(--color-accent);
  font-size: 11px;
  letter-spacing: -1px;
}
.chip--rarity-legendary {
  border-color: oklch(0.72 0.16 195);
}
.chip--rarity-fabled {
  border-color: oklch(0.65 0.2 5);
}
.chip--rarity-mythic {
  border-color: oklch(0.62 0.2 320);
}
.chip--rarity-rare {
  border-color: oklch(0.65 0.15 320);
}
.chip--rarity-unique {
  border-color: oklch(0.8 0.12 90);
}
.chip--rarity-set {
  border-color: oklch(0.7 0.16 145);
}
</style>
