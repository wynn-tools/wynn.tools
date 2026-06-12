<script setup lang="ts">
import type { WorldEventFilter, WorldEventSort } from '~/lib/world-events/types'
import { useIntervalFn } from '@vueuse/core'
import { computed, ref } from 'vue'
import SearchPage from '~/components/SearchPage.vue'
import EventCard from '~/components/WorldEvent/EventCard.vue'
import FiltersSidebar from '~/components/WorldEvent/FiltersSidebar.vue'
import { useJoinedWorldEvents } from '~/composables/useWorldEvents'
import { defaultFilter, filterWorldEvents } from '~/lib/world-events/filter'
import { sortWorldEvents } from '~/lib/world-events/sort'

definePageMeta({ ssr: false })

useSeoMeta({
  title: 'World Events — wynn.tools',
  ogTitle: 'World Events — wynn.tools',
  description: 'Browse Wynncraft world events with full loot tables, live spawn schedules, and filters.',
  ogDescription: 'Browse Wynncraft world events with full loot tables, live spawn schedules, and filters.',
})

const { joined, loading } = useJoinedWorldEvents()
const filter = ref<WorldEventFilter>(defaultFilter())
const sort = ref<WorldEventSort>('level')

const now = ref(Date.now())
useIntervalFn(() => {
  now.value = Date.now()
}, 30_000)

const visible = computed(() => sortWorldEvents(filterWorldEvents(joined.value, filter.value), sort.value, now.value))

function reset() {
  filter.value = defaultFilter()
}
const filterActive = computed(() => JSON.stringify(filter.value) !== JSON.stringify(defaultFilter()))
</script>

<template>
  <SearchPage>
    <template #toolbar>
      <div class="we-toolbar">
        <h1 class="kicker">
          World Events
        </h1>
        <label class="sort">
          <span class="kicker">Sort</span>
          <select v-model="sort">
            <option value="level">Level</option>
            <option value="name">Name</option>
            <option value="nextSpawn">Next spawn</option>
          </select>
        </label>
      </div>
    </template>

    <template #sidebar>
      <FiltersSidebar v-model="filter" :events="joined" />
    </template>

    <div v-if="loading && !joined.length" class="muted">
      Loading events…
    </div>
    <div v-else-if="!visible.length && filterActive" class="empty">
      No events match these filters. <button type="button" @click="reset">
        Reset
      </button>
    </div>
    <div v-else-if="!visible.length" class="empty">
      No events.
    </div>
    <EventCard v-for="j in visible" :key="j.slug" :event="j" />
  </SearchPage>
</template>

<style scoped>
.we-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}
.sort {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.sort select {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  border-radius: 6px;
}
.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--color-muted);
}
.empty button {
  color: var(--color-accent);
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
}
.muted {
  color: var(--color-muted);
  padding: 20px 0;
}
</style>
