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

    <ol v-else class="log">
      <li v-for="(e, i) in shown" :key="i" class="entry" :class="[`entry--${e.kind}`]">
        <div class="anchor">
          <span class="version">v{{ e.version }}</span>
          <span class="kind">{{ KIND_LABEL[e.kind] }}</span>
        </div>
        <ul v-if="e.fields?.length" class="deltas">
          <li v-for="f in e.fields" :key="f.label" class="delta" :class="{ good: f.good === true, bad: f.good === false }">
            <span class="d-label">{{ f.label }}</span>
            <span class="d-values">
              <span class="d-from">{{ fmt(f.from, f.unit) }}</span>
              <span class="d-arrow" aria-hidden="true">→</span>
              <span class="d-to">{{ fmt(f.to, f.unit) }}</span>
            </span>
          </li>
        </ul>
        <p v-else class="bare">
          {{ e.kind === 'added' ? 'Introduced to the game.' : 'Removed from the game.' }}
        </p>
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
  margin-bottom: 18px;
}
.kicker {
  font-size: 11px;
  line-height: 1;
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
  margin: 0;
}
.log {
  list-style: none;
  margin: 0;
  padding: 0;
}
.entry {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 20px;
  padding: 14px 0;
  border-top: 1px solid var(--color-border);
}
.entry:first-child {
  padding-top: 4px;
  border-top: 0;
}
.entry:last-child {
  padding-bottom: 2px;
}
.anchor {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.version {
  font: 700 17px/1 var(--font-mono);
  color: var(--color-text);
  letter-spacing: -0.02em;
}
.kind {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.14em;
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.delta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}
.d-label {
  font-size: 13px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}
.d-values {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  flex-shrink: 0;
  font: 500 12px/1.2 var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.d-from {
  color: var(--color-faint);
}
.d-arrow {
  color: var(--color-faint);
  font-size: 11px;
}
.d-to {
  color: var(--color-text);
}
.delta.good .d-to {
  color: oklch(74% 0.16 145);
}
.delta.bad .d-to {
  color: oklch(66% 0.18 25);
}
.bare {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--color-muted);
  align-self: center;
}
.more {
  margin-top: 16px;
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
@media (max-width: 720px) {
  .history {
    padding: 14px 14px 16px;
  }
  .title {
    font-size: 18px;
  }
  .entry {
    padding: 12px 0;
  }
  .more {
    padding: 9px 12px;
    min-height: 36px;
  }
}

@media (max-width: 520px) {
  .entry {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .anchor {
    flex-direction: row;
    align-items: baseline;
    gap: 10px;
  }
}
</style>
