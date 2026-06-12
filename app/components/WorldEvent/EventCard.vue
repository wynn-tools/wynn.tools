<script setup lang="ts">
import type { JoinedWorldEvent } from '~/lib/world-events/types'
import { computed } from 'vue'
import Countdown from './Countdown.vue'

const props = defineProps<{ event: JoinedWorldEvent }>()
const preview = computed(() => props.event.resolved?.exclusiveItems.slice(0, 3) ?? [])
const lengthChar = computed(() => ({ SHORT: 'S', MEDIUM: 'M', LONG: 'L' } as const)[props.event.event.length])
</script>

<template>
  <NuxtLink :to="`/world-events/${event.slug}`" class="row" :class="{ 'row--hard': event.event.difficulty === 'HARD' }">
    <div class="row__head">
      <span v-if="event.loot?.region" class="row__region">{{ event.loot.region }}</span>
      <h2 class="row__name">
        {{ event.event.name }}
      </h2>
      <Countdown :schedule="event.event.schedule" />
    </div>
    <div class="row__meta">
      <span class="meta meta--lvl">Lv {{ event.event.level }}</span>
      <span class="meta meta--diff" :data-diff="event.event.difficulty">{{ event.event.difficulty.toLowerCase() }}</span>
      <span class="meta meta--len" :title="event.event.length.toLowerCase()">{{ lengthChar }}</span>
      <span v-if="preview.length" class="row__preview">
        <span v-for="(p, i) in preview" :key="p.name">{{ p.name }}<span v-if="i < preview.length - 1" aria-hidden="true"> · </span></span>
      </span>
      <span v-else-if="!event.loot" class="row__preview row__preview--missing">Loot data not yet documented</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.row {
  display: block;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  transition:
    border-color 0.14s ease-out,
    background 0.14s ease-out;
}
.row:hover {
  border-color: color-mix(in oklch, var(--color-accent) 50%, var(--color-border));
  background: var(--color-surface-hi);
}
.row:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.row--hard {
  border-color: color-mix(in oklch, var(--color-faint) 60%, var(--color-border));
}

.row__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.row__region {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  flex-shrink: 0;
}
.row__name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.meta {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.meta--diff[data-diff='HARD'] {
  color: var(--color-text);
  font-weight: 600;
  letter-spacing: 0.12em;
}
.meta--len {
  font-variant-numeric: tabular-nums;
  width: 12px;
  text-align: center;
}

.row__preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--color-faint);
}
.row__preview--missing {
  font-style: italic;
}
</style>
