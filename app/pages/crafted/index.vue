<script setup lang="ts">
import type { SortOption } from '~/components/SearchSortBar.vue'
import type { ApiItemSummary, ItemListFilters } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

useSeoMeta({
  title: 'Public Crafted Items — wynn.tools',
  description: 'Browse crafted items shared by the community.',
})

const route = useRoute()
const router = useRouter()

const q = computed(() => (route.query.q as string) || '')
const sort = computed<SortOption>(() => {
  const s = route.query.sort as string
  return s === 'oldest' || s === 'name' ? s : 'newest'
})

function setFilter(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, cursor: undefined } })
}

function onQ(val: string) {
  setFilter({ q: val || undefined })
}
function onSort(val: SortOption) {
  setFilter({ sort: val === 'newest' ? undefined : val })
}

const api = useApi()
const items = ref<ApiItemSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const mobileFiltersOpen = ref(false)

const filters = computed<ItemListFilters>(() => ({
  q: q.value || undefined,
  sort: sort.value,
}))

async function load(cursor?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await api.listPublicItems(filters.value, cursor, 20)
    items.value = cursor ? [...items.value, ...res.data] : res.data
    nextCursor.value = res.nextCursor
  }
  catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load items'
  }
  finally {
    loading.value = false
  }
}

watch(filters, () => {
  items.value = []
  nextCursor.value = null
  load()
}, { deep: true })

await useAsyncData('public-items', () => load())
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="false" @click="navigateTo('/builds')">
          Builds
        </button>
        <button role="tab" class="on" aria-selected="true" @click="navigateTo('/crafted')">
          Crafted Items
        </button>
      </div>
    </div>

    <div class="layout">
      <button
        type="button"
        class="filters-toggle"
        :aria-expanded="mobileFiltersOpen"
        aria-controls="crafted-filters-panel"
        @click="mobileFiltersOpen = !mobileFiltersOpen"
      >
        <span class="filters-toggle-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </span>
        <span>{{ mobileFiltersOpen ? 'Hide filters' : 'Filters' }}</span>
        <span class="filters-toggle-chevron" :class="{ open: mobileFiltersOpen }" aria-hidden="true">›</span>
      </button>

      <aside
        id="crafted-filters-panel"
        class="sidebar"
        :class="{ 'sidebar--collapsed-mobile': !mobileFiltersOpen }"
      >
        <div class="filters">
          <SearchSortBar :q="q" :sort="sort" @update:q="onQ" @update:sort="onSort" />
        </div>
      </aside>

      <section class="results">
        <p v-if="loadError" class="state">
          {{ loadError }}
        </p>
        <p v-else-if="items.length === 0 && !loading" class="state">
          No crafted items match these filters.
        </p>
        <template v-else>
          <div class="card-grid">
            <ItemCard
              v-for="item in items"
              :id="item.id"
              :key="item.id"
              :name="item.name"
              :game-version="item.gameVersion"
              :owner-id="item.owner?.id"
              :owner-name="item.owner?.name"
              :show-owner="true"
              :craft-hash="item.craftHash"
            />
          </div>
          <div v-if="nextCursor" class="load-more">
            <button class="load-more-btn" type="button" :disabled="loading" @click="load(nextCursor ?? undefined)">
              {{ loading ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 0 64px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  max-width: 100%;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tabs button {
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: var(--color-muted);
  padding: 6px 14px;
  cursor: pointer;
  font: 600 12px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.tabs button:hover {
  color: var(--color-text);
}

.tabs button.on {
  color: var(--color-accent);
  background: oklch(65% 0.15 48 / 0.08);
}

.tabs button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.layout {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}

.filters-toggle {
  display: none;
}

.sidebar {
  position: sticky;
  top: 76px;
  align-self: start;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.results {
  min-width: 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.state {
  padding: 56px 20px;
  color: var(--color-muted);
  text-align: center;
  font-size: 14px;
}

.load-more {
  display: flex;
  justify-content: center;
}

.load-more-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 20px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.load-more-btn:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.load-more-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .sidebar {
    position: static;
  }
}

@media (max-width: 720px) {
  .page {
    padding: 12px 0 48px;
  }

  .toolbar {
    padding-bottom: 14px;
    margin-bottom: 16px;
  }

  .tabs button {
    padding: 8px 12px;
    min-height: 36px;
  }

  .layout {
    gap: 14px;
  }

  .filters-toggle {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 8px 14px;
    color: var(--color-muted);
    cursor: pointer;
    font: 500 11px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition:
      color 0.12s ease-out,
      border-color 0.12s ease-out;
  }

  .filters-toggle:hover,
  .filters-toggle[aria-expanded='true'] {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .filters-toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .filters-toggle-icon {
    display: inline-flex;
    align-items: center;
    color: currentColor;
  }

  .filters-toggle-chevron {
    margin-left: auto;
    transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    transform: rotate(90deg);
    font-size: 14px;
    line-height: 1;
  }

  .filters-toggle-chevron.open {
    transform: rotate(-90deg);
    color: var(--color-accent);
  }

  .sidebar--collapsed-mobile {
    display: none;
  }

  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filters-toggle-chevron {
    transition: none;
  }
}
</style>
