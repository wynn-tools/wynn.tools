<script setup lang="ts">
import type { JoinedWorldEvent } from '~/lib/world-events/types'
import { computed } from 'vue'
import Countdown from './Countdown.vue'

const props = defineProps<{ event: JoinedWorldEvent }>()
const preview = computed(() => props.event.resolved?.exclusiveItems.slice(0, 3) ?? [])
</script>

<template>
  <NuxtLink :to="`/world-events/${event.slug}`" class="event-card">
    <header>
      <h2>{{ event.event.name }}</h2>
      <Countdown :schedule="event.event.schedule" />
    </header>
    <div class="chips">
      <span v-if="event.loot?.region" class="badge badge--region">{{ event.loot.region }}</span>
      <span class="badge">Lv {{ event.event.level }}</span>
      <span class="badge" :class="`badge--diff-${event.event.difficulty.toLowerCase()}`">{{ event.event.difficulty }}</span>
      <span class="badge">{{ event.event.length }}</span>
    </div>
    <div v-if="preview.length" class="preview">
      <span v-for="p in preview" :key="p.name" class="preview__item">{{ p.name }}</span>
    </div>
    <div v-else-if="!event.loot" class="preview preview--missing">
      Loot data not yet documented
    </div>
  </NuxtLink>
</template>

<style scoped>
.event-card {
  display: block;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  transition: border-color 120ms;
}
.event-card:hover {
  border-color: var(--color-accent);
}
.event-card + .event-card {
  margin-top: 10px;
}
.event-card header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.event-card h2 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  font-size: 11px;
  color: var(--color-muted);
  background: var(--color-bg);
}
.badge--region {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.badge--diff-hard {
  color: oklch(0.65 0.2 5);
}
.badge--diff-medium {
  color: oklch(0.8 0.12 90);
}
.badge--diff-easy {
  color: oklch(0.7 0.16 145);
}
.preview {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-muted);
}
.preview__item:not(:last-child)::after {
  content: ' · ';
}
.preview--missing {
  font-style: italic;
}
</style>
