<script setup lang="ts">
import type { SortOption } from '~/components/SearchSortBar.vue'
import type { ApiBuildSummary, BuildListFilters } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'
import { useItemSearchData } from '~/composables/useItemSearchData'
import { CLASS_THEMES, classWeaponUrl } from '~/lib/build/class-theme'

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

function onItemBlur() {
  setTimeout(() => {
    itemPickerOpen.value = false
  }, 150)
}

// --- list state ---
const api = useApi()
const builds = ref<ApiBuildSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const mobileFiltersOpen = ref(false)

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
  <div class="page">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button role="tab" class="on" aria-selected="true" @click="navigateTo('/builds')">
          Builds
        </button>
        <button role="tab" aria-selected="false" @click="navigateTo('/crafted')">
          Crafted Items
        </button>
      </div>
    </div>

    <div class="layout">
      <button
        type="button"
        class="filters-toggle"
        :aria-expanded="mobileFiltersOpen"
        aria-controls="builds-filters-panel"
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
        id="builds-filters-panel"
        class="sidebar"
        :class="{ 'sidebar--collapsed-mobile': !mobileFiltersOpen }"
      >
        <div class="filters">
          <SearchSortBar :q="q" :sort="sort" @update:q="onQ" @update:sort="onSort" />

          <fieldset class="f-group f-group--class">
            <legend>Class</legend>
            <button
              v-for="cls in CLASSES"
              :key="cls"
              type="button"
              :class="{ on: activeClass === cls }"
              :style="{ '--cls-color': CLASS_THEMES[cls]?.color }"
              @click="toggleClass(cls)"
            >
              <img :src="classWeaponUrl(cls)" class="cls-icon" alt="" aria-hidden="true">
              {{ cls }}
            </button>
          </fieldset>

          <fieldset class="f-group f-group--col">
            <legend>Item</legend>
            <div class="item-picker">
              <div class="item-picker-wrap">
                <input
                  v-model="itemPickerInput"
                  class="item-input"
                  type="text"
                  placeholder="Filter by item…"
                  @focus="itemPickerOpen = true"
                  @blur="onItemBlur"
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
          </fieldset>
        </div>
      </aside>

      <section class="results">
        <p v-if="loadError" class="state">
          {{ loadError }}
        </p>
        <p v-else-if="builds.length === 0 && !loading" class="state">
          No builds match these filters.
        </p>
        <template v-else>
          <div class="card-grid">
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

.f-group {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.f-group--col {
  flex-direction: column;
  align-items: stretch;
}

.f-group legend {
  width: 100%;
  font: 500 11px/1 var(--font-mono);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
  padding: 0;
}

.f-group button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  font-size: 12px;
  padding: 4px 9px;
  cursor: pointer;
  text-transform: capitalize;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}

.f-group button:hover {
  color: var(--color-text);
  border-color: var(--color-faint);
}

.f-group button.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: oklch(65% 0.15 48 / 0.08);
}

.f-group button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Class filter buttons: per-class color via --cls-color */
.f-group--class button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.f-group--class button:hover {
  color: var(--cls-color);
  border-color: color-mix(in oklch, var(--cls-color) 45%, var(--color-border));
}

.f-group--class button.on {
  color: var(--cls-color);
  border-color: var(--cls-color);
  background: color-mix(in oklch, var(--cls-color) 12%, transparent);
}

.f-group--class button:focus-visible {
  outline-color: var(--cls-color);
}

.cls-icon {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  object-fit: contain;
  flex-shrink: 0;
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
  width: 100%;
  padding: 7px 28px 7px 10px;
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  outline: none;
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
