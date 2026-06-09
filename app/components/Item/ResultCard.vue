<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { useBuilderRail } from '~/composables/useBuilderRail'
import { SLOT_LABELS } from '~/lib/builder-draft/routing'
import { itemSlug } from '~/lib/items-search/slug'

const props = defineProps<{ item: SearchItem }>()

const rail = useBuilderRail()
const equippedSlot = computed(() => rail.slotOfItem(props.item.id))
const equipped = computed(() => equippedSlot.value != null)
const equippedLabel = computed(() => equippedSlot.value != null ? SLOT_LABELS[equippedSlot.value] : '')
</script>

<template>
  <div class="card-wrap" :class="{ 'is-equipped': equipped }">
    <NuxtLink
      :to="`/items/${itemSlug(item)}`"
      class="card-link"
      :aria-label="`Open ${item.name} details`"
    >
      <ItemTooltip :item="item" :exportable="false" />
    </NuxtLink>
    <span v-if="equipped" class="card-tag">
      <span class="card-tag-check" aria-hidden="true">✓</span>{{ equippedLabel }}
    </span>
    <div class="card-equip">
      <BuilderEquipButton :item="item" />
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
  text-decoration: none;
  border-radius: 4px;
  zoom: 0.75;
  transition:
    transform 0.12s ease-out,
    box-shadow 0.12s ease-out;
}
.card-link:hover {
  transform: translateY(-1px);
}
.card-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}
.is-equipped .card-link {
  box-shadow: 0 0 0 2px var(--color-accent);
  border-radius: 4px;
}

/* Equipped state corner tag, mirrored from the previous row layout. */
.card-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 18%, var(--color-surface));
  border-radius: 4px;
  z-index: 2;
  transition: opacity 0.12s ease-out;
  pointer-events: none;
}
.card-tag-check {
  font-size: 10px;
}
.card-wrap:hover .card-tag,
.card-wrap:focus-within .card-tag {
  opacity: 0;
}

.card-equip {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity 0.12s ease-out,
    transform 0.12s ease-out;
  z-index: 3;
}
.card-wrap:hover .card-equip,
.card-wrap:focus-within .card-equip {
  opacity: 1;
  transform: none;
}
@media (hover: none) {
  .card-equip {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .card-link,
  .card-tag,
  .card-equip {
    transition: none;
  }
}
</style>
