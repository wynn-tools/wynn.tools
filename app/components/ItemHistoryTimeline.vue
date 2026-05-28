<script setup lang="ts">
import type { HistoryEntry } from '~/lib/items-search/history'

const props = defineProps<{ entries: HistoryEntry[] }>()
const showAll = ref(false)
const MAX = 4
const shown = computed(() => showAll.value ? props.entries : props.entries.slice(0, MAX))
const KIND_LABEL: Record<HistoryEntry['kind'], string> = { added: 'Added', removed: 'Removed', modified: 'Modified' }

function fmt(v: number | null, unit: string): string {
  if (v === null || v === undefined)
    return '—'
  return `${v}${unit ?? ''}`
}
</script>

<template>
  <section class="history">
    <header class="head">
      <span class="kicker">Item History</span>
      <h2 class="title">
        Changes
      </h2>
      <span class="count">{{ entries.length }} {{ entries.length === 1 ? 'entry' : 'entries' }}</span>
    </header>

    <p v-if="entries.length === 0" class="empty">
      No recorded changes since the start of v2.
    </p>

    <ol v-else class="rail">
      <li v-for="(e, i) in shown" :key="i" class="entry" :class="[`entry--${e.kind}`]">
        <span class="marker" aria-hidden="true" />
        <div class="head-row">
          <span class="version">v{{ e.version }}</span>
          <span class="kind">{{ KIND_LABEL[e.kind] }}</span>
        </div>
        <ul v-if="e.fields?.length" class="deltas">
          <li v-for="f in e.fields" :key="f.label" :class="{ good: f.good === true, bad: f.good === false }">
            <span class="d-label">{{ f.label }}</span>
            <span class="d-from">{{ fmt(f.from, f.unit) }}</span>
            <span class="d-arrow" aria-hidden="true">→</span>
            <span class="d-to">{{ fmt(f.to, f.unit) }}</span>
          </li>
        </ul>
      </li>
    </ol>

    <button v-if="entries.length > MAX" class="more" @click="showAll = !showAll">
      {{ showAll ? 'Show less' : `Show ${entries.length - MAX} more` }}
    </button>
  </section>
</template>

<style scoped>
.history {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 18px 20px 20px;
}
.head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
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
.empty {
  color: var(--color-muted);
  font-size: 13px;
  padding: 12px 0;
}
.rail {
  list-style: none;
  margin: 0;
  padding: 0 0 0 18px;
  position: relative;
}
.rail::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 4px;
  bottom: 4px;
  width: 1px;
  background: var(--color-border);
}
.entry {
  position: relative;
  padding-bottom: 18px;
}
.entry:last-child {
  padding-bottom: 0;
}
.marker {
  position: absolute;
  left: -18px;
  top: 5px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
}
.entry--modified .marker {
  border-color: var(--color-accent);
}
.entry--added .marker {
  border-color: oklch(74% 0.16 145);
}
.entry--removed .marker {
  border-color: oklch(66% 0.18 25);
}
.head-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.version {
  font: 700 14px/1 var(--font-mono);
  color: var(--color-text);
  letter-spacing: -0.01em;
}
.kind {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.entry--modified .kind {
  color: var(--color-accent);
}
.entry--added .kind {
  color: oklch(74% 0.16 145);
}
.entry--removed .kind {
  color: oklch(66% 0.18 25);
}
.deltas {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 2px 10px;
  align-items: baseline;
  font-size: 12px;
  color: var(--color-muted);
}
.deltas li {
  display: contents;
}
.d-label {
  font-size: 12px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.d-from,
.d-to {
  font: 500 12px/1.2 var(--font-mono);
  white-space: nowrap;
}
.d-from {
  color: var(--color-faint);
  text-align: right;
}
.d-arrow {
  color: var(--color-faint);
  font-size: 11px;
}
.d-to {
  color: var(--color-text);
  text-align: right;
}
.deltas .good .d-to {
  color: oklch(74% 0.16 145);
}
.deltas .bad .d-to {
  color: oklch(66% 0.18 25);
}
.more {
  margin-top: 14px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-muted);
  cursor: pointer;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 7px 12px;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.more:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.more:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
