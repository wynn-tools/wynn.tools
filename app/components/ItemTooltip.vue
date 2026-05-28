<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { itemIconUrl } from '~/lib/items/icon'

const props = defineProps<{ item: SearchItem }>()

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

const nameColor = computed(() => TIER_COLORS[props.item.tier] ?? '#ffffff')
const icon = computed(() => itemIconUrl(props.item))

interface Row { label: string, unit: string, raw: number, min: number, max: number, good: boolean }
const idRows = computed<Row[]>(() =>
  Object.entries(props.item.identifications).map(([key, r]) => {
    const { label, unit } = humanizeField(key)
    const good = isInverted(key) ? r.raw < 0 : r.raw > 0
    return { label, unit, raw: r.raw, min: r.min, max: r.max, good }
  }),
)
const loreText = computed(() => props.item.lore?.map(n => n.text).join('') ?? '')
</script>

<template>
  <div class="tooltip">
    <header class="tt-head">
      <img v-if="icon" :src="icon" class="tt-icon" alt="" aria-hidden="true">
      <span class="tt-name" :style="{ color: nameColor }">{{ item.displayName }}</span>
    </header>
    <p class="tt-sub">
      {{ item.tier }} {{ item.subType }}
      <span v-if="item.elements.length" class="tt-elements">· {{ item.elements.join(', ') }}</span>
    </p>
    <p v-if="item.averageDps != null" class="tt-dps">
      Average DPS: {{ item.averageDps }}
    </p>

    <ul class="tt-ids">
      <li v-for="row in idRows" :key="row.label" :class="{ good: row.good, bad: !row.good }">
        <span class="tt-id-val">{{ row.raw > 0 ? '+' : '' }}{{ row.raw }}{{ row.unit }}</span>
        <span class="tt-id-label">{{ row.label }}</span>
        <span v-if="row.min !== row.max" class="tt-id-range">{{ row.min }} to {{ row.max }}{{ row.unit }}</span>
      </li>
    </ul>

    <p v-if="item.requirements?.level" class="tt-req">
      Combat Lv. Min: {{ item.requirements.level }}
    </p>
    <p v-if="item.powderSlots" class="tt-powder">
      [{{ item.powderSlots }} Powder Slots]
    </p>
    <ul v-if="item.majorIds.length" class="tt-major">
      <li v-for="m in item.majorIds" :key="m.name">
        {{ m.name }}
      </li>
    </ul>
    <p v-if="item.sets.length" class="tt-set">
      Set: {{ item.sets.join(', ') }}
    </p>
    <p v-if="loreText" class="tt-lore">
      {{ loreText }}
    </p>
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
  max-width: 340px;
}
.tt-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tt-icon {
  width: 28px;
  height: 28px;
  image-rendering: pixelated;
}
.tt-name {
  font-size: 14px;
  font-weight: 600;
}
.tt-sub {
  color: var(--color-muted);
  margin: 2px 0 8px;
  text-transform: capitalize;
}
.tt-ids {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
.tt-elements {
  color: var(--color-faint);
}
.tt-dps {
  color: var(--color-accent);
  margin-bottom: 8px;
}
.tt-req,
.tt-powder {
  color: var(--color-muted);
  margin-top: 8px;
}
.tt-set {
  color: #6fe26f;
  margin-top: 8px;
}
.tt-major {
  list-style: none;
  color: var(--color-accent);
  margin-top: 8px;
}
.tt-lore {
  color: var(--color-faint);
  font-style: italic;
  margin-top: 8px;
}
</style>
