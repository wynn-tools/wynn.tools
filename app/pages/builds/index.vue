<script setup lang="ts">
import type { SortOption } from '~/components/SearchSortBar.vue'
import type { ApiBuildSummary, BuildListFilters } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'
import { useItemSearchData } from '~/composables/useItemSearchData'

useSeoMeta({
  title: 'Public Builds — wynn.tools',
  description: 'Browse Wynncraft builds shared by the community.',
})

const route = useRoute()
const router = useRouter()

// --- filter state from URL ---
const q = computed(() => (route.query.q as string) || '')
const sort = computed<SortOption>(() => {
  const s = route.query.sort as string
  return s === 'oldest' || s === 'name' ? s : 'newest'
})
const activeClass = computed(() => (route.query.class as string) || '')
const activeItemId = computed(() => {
  const v = Number(route.query.itemId)
  return Number.isFinite(v) && v > 0 ? v : null
})

// --- item picker state ---
const { data: searchData } = useItemSearchData()
const itemPickerInput = ref('')
const itemPickerOpen = ref(false)
const itemSuggestions = computed(() => {
  if (!searchData.value || itemPickerInput.value.trim().length < 2)
    return []
  const needle = itemPickerInput.value.toLowerCase()
  return searchData.value.items
    .filter(i => i.name.toLowerCase().includes(needle))
    .slice(0, 8)
})
const selectedItemName = computed(() => {
  if (!activeItemId.value || !searchData.value)
    return null
  return searchData.value.items.find(i => i.id === activeItemId.value)?.name ?? null
})

function selectItem(id: number, name: string) {
  itemPickerInput.value = name
  itemPickerOpen.value = false
  setFilter({ itemId: String(id) })
}
function clearItem() {
  itemPickerInput.value = ''
  setFilter({ itemId: undefined })
}

// --- filter update helpers ---
function setFilter(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, cursor: undefined } })
}

function onQ(val: string) {
  setFilter({ q: val || undefined })
}
function onSort(val: SortOption) {
  setFilter({ sort: val === 'newest' ? undefined : val })
}
function toggleClass(cls: string) {
  setFilter({ class: activeClass.value === cls ? undefined : cls })
}

// --- list state ---
const api = useApi()
const builds = ref<ApiBuildSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const filters = computed<BuildListFilters>(() => ({
  q: q.value || undefined,
  sort: sort.value,
  class: (activeClass.value as BuildListFilters['class']) || undefined,
  itemId: activeItemId.value ?? undefined,
}))

async function load(cursor?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await api.listPublicBuilds(filters.value, cursor, 20)
    builds.value = cursor ? [...builds.value, ...res.data] : res.data
    nextCursor.value = res.nextCursor
  }
  catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load builds'
  }
  finally {
    loading.value = false
  }
}

// Reload from page 1 whenever filters change
watch(filters, () => {
  builds.value = []
  nextCursor.value = null
  load()
}, { deep: true })

await useAsyncData('public-builds', () => load())

const CLASSES = ['Assassin', 'Warrior', 'Mage', 'Archer', 'Shaman'] as const

// Sync item picker input with the currently-selected item's name
watch(selectedItemName, (name) => {
  if (name && !itemPickerOpen.value)
    itemPickerInput.value = name
})
</script>

<template>
  <div class="list-page">
    <header class="list-header">
      <h1 class="list-title">
        Public Builds
      </h1>
    </header>

    <div class="toolbar">
      <SearchSortBar :q="q" :sort="sort" @update:q="onQ" @update:sort="onSort" />
      <div class="class-chips">
        <button
          v-for="cls in CLASSES"
          :key="cls"
          type="button"
          class="chip"
          :class="{ active: activeClass === cls }"
          @click="toggleClass(cls)"
        >
          {{ cls }}
        </button>
      </div>
      <div class="item-picker">
        <div class="item-picker-wrap">
          <input
            v-model="itemPickerInput"
            class="item-input"
            type="text"
            placeholder="Filter by item…"
            @focus="itemPickerOpen = true"
            @blur="window.setTimeout(() => { itemPickerOpen = false }, 150)"
            @input="itemPickerOpen = true"
          >
          <button v-if="activeItemId" class="item-clear" type="button" aria-label="Clear item filter" @click="clearItem">
            ×
          </button>
        </div>
        <ul v-if="itemPickerOpen && itemSuggestions.length" class="item-suggestions">
          <li
            v-for="item in itemSuggestions"
            :key="item.id"
            class="item-suggestion"
            @mousedown.prevent="selectItem(item.id, item.name)"
          >
            {{ item.name }}
          </li>
        </ul>
      </div>
    </div>

    <p v-if="loadError" class="error-text">
      {{ loadError }}
    </p>

    <div v-else-if="builds.length === 0 && !loading" class="empty-state">
      No builds match these filters.
    </div>

    <div v-else class="card-grid">
      <BuildCard
        v-for="b in builds"
        :id="b.id"
        :key="b.id"
        :name="b.name"
        :game-version="b.gameVersion"
        :owner-id="b.owner?.id"
        :owner-name="b.owner?.name"
        :show-owner="true"
      />
    </div>

    <div v-if="nextCursor" class="load-more">
      <button class="load-more-btn" type="button" :disabled="loading" @click="load(nextCursor ?? undefined)">
        {{ loading ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.class-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 5px 12px;
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.chip:hover {
  color: var(--color-text);
}

.chip.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: oklch(65% 0.15 48 / 0.08);
}

.item-picker {
  position: relative;
}

.item-picker-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.item-input {
  padding: 7px 28px 7px 10px;
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  outline: none;
  width: 180px;
  transition: border-color 0.12s ease-out;
}

.item-input::placeholder {
  color: var(--color-muted);
}

.item-input:focus {
  border-color: var(--color-accent);
}

.item-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
}

.item-clear:hover {
  color: var(--color-text);
}

.item-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  list-style: none;
  padding: 4px 0;
  margin: 0;
  z-index: 10;
  box-shadow: 0 4px 12px oklch(0% 0 0 / 0.15);
  max-height: 240px;
  overflow-y: auto;
}

.item-suggestion {
  padding: 7px 12px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.1s ease-out;
}

.item-suggestion:hover {
  background: var(--color-surface-hi);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.empty-state {
  font-size: 14px;
  color: var(--color-muted);
  padding: 32px 0;
}

.error-text {
  color: oklch(62% 0.15 20);
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
</style>
