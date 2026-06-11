<script setup lang="ts">
import type { StockListItem } from '~/lib/types/stock'
import { CLASS_THEMES, classWeaponUrl } from '~/lib/build/class-theme'

const props = defineProps<{ item: StockListItem }>()

const KIND_LABELS: Record<StockListItem['kind'], string> = {
  'infobox': 'Info box',
  'custom-bar': 'Custom bar',
  'bundle': 'Bundle',
}

const classDisplay = computed(() =>
  props.item.classes.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
)
</script>

<template>
  <article class="stock-card">
    <NuxtLink :to="`/stock/${item.slug}`" class="card-link">
      <span class="card-head">
        <span class="card-name">{{ item.title }}</span>
        <span class="card-kind">{{ KIND_LABELS[item.kind] }}</span>
      </span>
      <p v-if="item.description" class="card-desc">
        {{ item.description }}
      </p>
      <span class="card-meta">
        <span v-if="classDisplay.length" class="card-classes">
          <img
            v-for="cls in classDisplay"
            :key="cls"
            :src="classWeaponUrl(cls)"
            class="card-cls"
            :style="{ '--cls-color': CLASS_THEMES[cls]?.color }"
            :alt="cls"
            :title="cls"
          >
        </span>
        <span class="card-counts">
          <span class="card-count" :title="`${item.installCount} installs`">↓ {{ item.installCount }}</span>
          <span class="card-count" :title="`${item.reactionCounts.total} reactions`">★ {{ item.reactionCounts.total }}</span>
        </span>
      </span>
    </NuxtLink>
  </article>
</template>

<style scoped>
.stock-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition:
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.stock-card:hover {
  border-color: color-mix(in oklch, var(--color-accent) 40%, transparent);
  background: var(--color-surface-hi);
}

.card-link {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  text-decoration: none;
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-kind {
  flex-shrink: 0;
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.card-desc {
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
}

.card-classes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-cls {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
  object-fit: contain;
  opacity: 0.85;
}

.card-counts {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.card-count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.04em;
  color: var(--color-faint);
}
</style>
