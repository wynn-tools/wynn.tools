<script setup lang="ts">
import type { HistoryEntry } from '~/lib/items-search/history'

const props = defineProps<{ entries: HistoryEntry[] }>()
const showAll = ref(false)
const MAX = 5
const shown = computed(() => showAll.value ? props.entries : props.entries.slice(0, MAX))
const KIND_LABEL: Record<HistoryEntry['kind'], string> = { added: 'Added', removed: 'Removed', modified: 'Modified' }
</script>

<template>
  <section class="history">
    <h2>Item History <span class="count">{{ entries.length }} {{ entries.length === 1 ? 'change' : 'changes' }}</span></h2>
    <p v-if="entries.length === 0" class="empty">
      No recorded changes since the start of v2.
    </p>
    <ul v-else class="timeline">
      <li v-for="(e, i) in shown" :key="i" class="entry" :class="e.kind">
        <span class="entry-kind">{{ KIND_LABEL[e.kind] }}</span>
        <span class="entry-version">v{{ e.version }}</span>
        <ul v-if="e.fields?.length" class="deltas">
          <li v-for="f in e.fields" :key="f.label" :class="{ good: f.good === true, bad: f.good === false }">
            {{ f.label }}: {{ f.from ?? '—' }} → {{ f.to ?? '—' }}{{ f.unit }}
          </li>
        </ul>
      </li>
    </ul>
    <button v-if="entries.length > MAX" class="more" @click="showAll = !showAll">
      {{ showAll ? 'Show less' : `Show all ${entries.length} changes` }}
    </button>
  </section>
</template>

<style scoped>
.history h2 {
  font-size: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.count {
  font-size: 11px;
  color: var(--color-muted);
  font-weight: 400;
}
.empty {
  color: var(--color-muted);
  font-size: 13px;
}
.timeline {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-left: 2px solid var(--color-border);
  padding-left: 16px;
}
.entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.entry-kind {
  font-weight: 600;
  font-size: 13px;
}
.entry.added .entry-kind {
  color: #6fe26f;
}
.entry.removed .entry-kind {
  color: #e06f6f;
}
.entry.modified .entry-kind {
  color: var(--color-accent);
}
.entry-version {
  font-size: 11px;
  color: var(--color-muted);
}
.deltas {
  list-style: none;
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 4px;
}
.deltas .good {
  color: #6fe26f;
}
.deltas .bad {
  color: #e06f6f;
}
.more {
  margin-top: 12px;
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 12px;
}
</style>
