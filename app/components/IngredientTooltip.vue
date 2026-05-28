<script setup lang="ts">
import type { SearchIngredient } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { itemIconUrl } from '~/lib/items/icon'

const props = defineProps<{ ingredient: SearchIngredient }>()
const icon = computed(() => itemIconUrl(props.ingredient))
const idRows = computed(() =>
  Object.entries(props.ingredient.identifications).map(([key, r]) => {
    const { label, unit } = humanizeField(key)
    return { label, unit, raw: r.raw, min: r.min, max: r.max, good: isInverted(key) ? r.raw < 0 : r.raw > 0 }
  }),
)
</script>

<template>
  <div class="tooltip">
    <header class="tt-head">
      <img v-if="icon" :src="icon" class="tt-icon" alt="" aria-hidden="true">
      <span class="tt-name">{{ ingredient.displayName }}</span>
    </header>
    <p class="tt-sub">
      Tier {{ ingredient.tier }} · Lv. {{ ingredient.level }}
    </p>
    <p v-if="ingredient.skills.length" class="tt-skills">
      {{ ingredient.skills.join(', ') }}
    </p>
    <ul class="tt-ids">
      <li v-for="row in idRows" :key="row.label" :class="{ good: row.good, bad: !row.good }">
        <span class="tt-id-val">{{ row.raw > 0 ? '+' : '' }}{{ row.raw }}{{ row.unit }}</span>
        <span class="tt-id-label">{{ row.label }}</span>
        <span v-if="row.min !== row.max" class="tt-id-range">{{ row.min }} to {{ row.max }}{{ row.unit }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tooltip {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 12px 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text);
  max-width: 320px;
}
.tt-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tt-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}
.tt-name {
  font-size: 13px;
  font-weight: 600;
}
.tt-sub,
.tt-skills {
  color: var(--color-muted);
  margin: 2px 0;
  text-transform: capitalize;
}
.tt-ids {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
}
.tt-ids li {
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.tt-ids .good .tt-id-val {
  color: #6fe26f;
}
.tt-ids .bad .tt-id-val {
  color: #e06f6f;
}
.tt-id-label {
  color: var(--color-muted);
}
.tt-id-range {
  color: var(--color-faint);
  font-size: 11px;
}
</style>
