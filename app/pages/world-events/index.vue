<script setup lang="ts">
import type { WorldEventFilter, WorldEventSort } from '~/lib/world-events/types'
import { useIntervalFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import EventCard from '~/components/WorldEvent/EventCard.vue'
import WorldEventFilters from '~/components/WorldEvent/Filters.vue'
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
const route = useRoute()
const router = useRouter()

function parseSort(v: unknown): WorldEventSort {
  return v === 'name' || v === 'nextSpawn' ? v : 'level'
}
function parseLevel(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 && n <= 110 ? n : fallback
}

const filter = ref<WorldEventFilter>({
  ...defaultFilter(),
  search: typeof route.query.q === 'string' ? route.query.q : '',
  levelMin: parseLevel(route.query.lmin, 1),
  levelMax: parseLevel(route.query.lmax, 110),
  hasSchedule: route.query.live === '1',
})
const sort = ref<WorldEventSort>(parseSort(route.query.sort))

watch([filter, sort], () => {
  const f = filter.value
  const def = defaultFilter()
  router.replace({
    query: {
      ...route.query,
      q: f.search || undefined,
      lmin: f.levelMin !== def.levelMin ? String(f.levelMin) : undefined,
      lmax: f.levelMax !== def.levelMax ? String(f.levelMax) : undefined,
      live: f.hasSchedule ? '1' : undefined,
      sort: sort.value !== 'level' ? sort.value : undefined,
    },
  })
}, { deep: true })

const now = ref(Date.now())
useIntervalFn(() => {
  now.value = Date.now()
}, 30_000)

const visible = computed(() => sortWorldEvents(filterWorldEvents(joined.value, filter.value), sort.value, now.value))

function reset() {
  filter.value = defaultFilter()
  sort.value = 'level'
}
const filterActive = computed(() => JSON.stringify(filter.value) !== JSON.stringify(defaultFilter()))

const liveCount = computed(() => joined.value.filter(j => j.event.schedule).length)
</script>

<template>
  <SearchPage>
    <template #toolbar>
      <h1 class="we-title">
        World Events
      </h1>
      <p class="page-desc">
        Loot tables, live spawn timers, and lore for every Wynncraft world event.
      </p>
      <div class="toolbar-tail">
        <span v-if="liveCount" class="live-pulse">
          <span class="live-pulse__dot" />
          {{ liveCount }} live
        </span>
        <label class="sort">
          <span>Sort</span>
          <select v-model="sort" class="f-input sort-select">
            <option value="level">
              Level
            </option>
            <option value="name">
              Name
            </option>
            <option value="nextSpawn">
              Next spawn
            </option>
          </select>
        </label>
      </div>
    </template>

    <template #sidebar>
      <FiltersSidebar panel-id="world-events-filters-panel">
        <WorldEventFilters v-model="filter" :events="joined" />
      </FiltersSidebar>
    </template>

    <div v-if="loading && !joined.length" class="state-block">
      <span>Loading events…</span>
    </div>
    <div v-else-if="!visible.length && filterActive" class="state-block">
      <span>No events match these filters.</span>
      <button type="button" class="state-action" @click="reset">
        Clear filters
      </button>
    </div>
    <div v-else-if="!visible.length" class="state-block">
      <span>No events found.</span>
    </div>
    <div v-else class="we-list">
      <EventCard v-for="j in visible" :key="j.slug" :event="j" />
    </div>
  </SearchPage>
</template>

<style scoped>
.we-title {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin: 0;
}
.toolbar-tail {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  flex-shrink: 0;
}
.live-pulse {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
}
.live-pulse__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent);
  animation: we-pulse 1.6s ease-out infinite;
}
@keyframes we-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
@media (prefers-reduced-motion: reduce) {
  .live-pulse__dot {
    animation: none;
  }
}
.sort {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.sort-select {
  width: auto;
  padding: 6px 28px 6px 10px;
  font: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23a8a9b3' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.we-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
@media (max-width: 720px) {
  .page-desc {
    display: none;
  }
}
</style>
