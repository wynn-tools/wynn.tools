<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { humanizeField } from '~/lib/data/identifications'
import { itemSlug } from '~/lib/items-search/slug'
import { itemIconUrl } from '~/lib/items/icon'

const props = defineProps<{ item: SearchItem, idKeys?: string[] }>()
const TIER_COLORS: Record<string, string> = {
  Normal: '#ffffff',
  Set: '#55ff55',
  Unique: '#ffff55',
  Rare: '#ff55ff',
  Legendary: '#55ffff',
  Fabled: '#ff5555',
  Mythic: '#aa00aa',
  Crafted: '#00aaaa',
}
const icon = computed(() => itemIconUrl(props.item))
const cols = computed(() => (props.idKeys ?? []).map(k => ({
  label: humanizeField(k).label,
  raw: props.item.identifications[k]?.raw,
})))
</script>

<template>
  <NuxtLink :to="{ path: `/items/${itemSlug(item)}`, query: { name: item.displayName } }" class="card">
    <img v-if="icon" :src="icon" class="card-icon" alt="" aria-hidden="true">
    <span v-else class="card-icon card-icon--empty" aria-hidden="true" />
    <div class="card-body">
      <span class="card-name" :style="{ color: TIER_COLORS[item.tier] ?? '#fff' }">{{ item.displayName }}</span>
      <span class="card-meta">Lv. {{ item.level }} · {{ item.subType }}</span>
      <ul v-if="cols.length" class="card-ids">
        <li v-for="c in cols" :key="c.label">
          <span class="card-id-val">{{ c.raw ?? '—' }}</span> {{ c.label }}
        </li>
      </ul>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  text-decoration: none;
  transition: border-color 0.1s;
}
.card:hover {
  border-color: var(--color-accent);
}
.card-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.card-icon--empty {
  visibility: hidden;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
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
.card-ids {
  list-style: none;
  font-size: 11px;
  color: var(--color-faint);
  margin-top: 4px;
}
.card-id-val {
  color: var(--color-accent);
}
</style>
