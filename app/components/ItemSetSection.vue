<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import type { ItemSet } from '~/lib/types/item'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { itemSlug } from '~/lib/items-search/slug'

const props = defineProps<{
  setName: string
  set: ItemSet
  current: SearchItem
  pieceLookup: Map<string, SearchItem>
}>()

interface PieceRow { name: string, item: SearchItem | undefined, isCurrent: boolean }
interface BonusRow { pieces: number, entries: Array<{ label: string, unit: string, value: number, good: boolean }> }

const pieces = computed<PieceRow[]>(() =>
  props.set.items.map(name => ({
    name,
    item: props.pieceLookup.get(name),
    isCurrent: name === props.current.name,
  })),
)

const bonuses = computed<BonusRow[]>(() => {
  const rows: BonusRow[] = []
  props.set.bonuses.forEach((bonusMap, idx) => {
    const keys = Object.keys(bonusMap)
    if (!keys.length)
      return
    const entries = keys.map((key) => {
      const value = bonusMap[key] ?? 0
      const { label, unit } = humanizeField(key)
      const flip = isInverted(key)
      const good = flip ? value < 0 : value > 0
      return { label, unit, value, good }
    })
    rows.push({ pieces: idx + 1, entries })
  })
  return rows
})
</script>

<template>
  <section class="set">
    <header class="head">
      <span class="kicker">Set</span>
      <h2 class="title">
        {{ setName }}
      </h2>
      <span class="count">{{ pieces.length }} pieces</span>
    </header>

    <ol v-if="pieces.length" class="pieces">
      <li v-for="p in pieces" :key="p.name" :class="{ current: p.isCurrent, missing: !p.item }">
        <NuxtLink
          v-if="p.item"
          :to="{ path: `/items/${itemSlug(p.item)}`, query: { name: p.item.displayName } }"
          class="piece"
        >
          <span class="piece-mark" aria-hidden="true" />
          <span class="piece-name">{{ p.item.displayName }}</span>
          <span class="piece-meta">{{ p.item.subType }}</span>
        </NuxtLink>
        <span v-else class="piece piece--missing">
          <span class="piece-mark" aria-hidden="true" />
          <span class="piece-name">{{ p.name }}</span>
          <span class="piece-meta">removed</span>
        </span>
      </li>
    </ol>

    <div v-if="bonuses.length" class="bonuses">
      <div v-for="row in bonuses" :key="row.pieces" class="bonus">
        <span class="bonus-pieces">{{ row.pieces }} <span class="bonus-pieces-unit">pcs</span></span>
        <ul class="bonus-list">
          <li v-for="(e, i) in row.entries" :key="i" :class="{ good: e.good, bad: !e.good && e.value !== 0 }">
            <span class="bonus-val">{{ e.value > 0 ? '+' : '' }}{{ e.value }}{{ e.unit }}</span>
            <span class="bonus-label">{{ e.label }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.set {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 18px 20px 20px;
}
.head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.kicker {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.title {
  font: 700 20px/1.1 var(--font-display, var(--font-body));
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0;
}
.count {
  margin-left: auto;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.pieces {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
  counter-reset: piece;
}
.pieces > li {
  counter-increment: piece;
}
.piece {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--color-muted);
  transition:
    background 0.12s ease-out,
    color 0.12s ease-out;
}
.piece-mark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border);
  flex-shrink: 0;
}
.piece:hover {
  background: oklch(65% 0.15 48 / 0.06);
  color: var(--color-text);
}
.piece-name {
  font-size: 13px;
  font-weight: 500;
}
.piece-meta {
  margin-left: auto;
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.current .piece {
  background: oklch(65% 0.15 48 / 0.1);
  color: var(--color-accent);
}
.current .piece-mark {
  background: var(--color-accent);
  box-shadow: 0 0 8px oklch(65% 0.15 48 / 0.6);
}
.current .piece-name {
  font-weight: 600;
}
.missing .piece {
  color: var(--color-faint);
  font-style: italic;
}
.bonuses {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
.bonus {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 14px;
  align-items: start;
}
.bonus-pieces {
  font: 700 22px/1 var(--font-display, var(--font-body));
  color: var(--color-text);
  letter-spacing: -0.02em;
  padding-top: 1px;
}
.bonus-pieces-unit {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-left: 2px;
}
.bonus-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 4px 16px;
}
.bonus-list li {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  color: var(--color-muted);
}
.bonus-val {
  font: 600 13px/1 var(--font-mono);
  color: var(--color-text);
  min-width: 48px;
}
.bonus-list .good .bonus-val {
  color: oklch(74% 0.16 145);
}
.bonus-list .bad .bonus-val {
  color: oklch(66% 0.18 25);
}
.bonus-label {
  font-size: 12px;
}
</style>
