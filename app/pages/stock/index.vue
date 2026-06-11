<script setup lang="ts">
import type { SortOption } from '~/components/SearchSortBar.vue'
import type { ApiUserSearchResult } from '~/composables/useApi'
import type { ListFilters } from '~/composables/useStockApi'
import type { StockCategory, StockClass, StockKind, StockListItem, StockSort } from '~/lib/types/stock'
import { useApi } from '~/composables/useApi'
import { CLASS_THEMES, classWeaponUrl } from '~/lib/build/class-theme'

useSeoMeta({
  title: 'Wynntils Stock — wynn.tools',
  ogTitle: 'Wynntils Stock — wynn.tools',
  description: 'Browse info boxes, custom bars and bundles shared by the Wynntils community.',
  ogDescription: 'Browse info boxes, custom bars and bundles shared by the Wynntils community.',
  twitterCard: 'summary_large_image',
})

const route = useRoute()
const router = useRouter()
const api = useStockApi()
const profileApi = useApi()

const KINDS: { value: StockKind, label: string }[] = [
  { value: 'infobox', label: 'Info box' },
  { value: 'custom-bar', label: 'Custom bar' },
  { value: 'bundle', label: 'Bundle' },
]
const CLASSES: { value: StockClass, label: string }[] = [
  { value: 'warrior', label: 'Warrior' },
  { value: 'archer', label: 'Archer' },
  { value: 'mage', label: 'Mage' },
  { value: 'assassin', label: 'Assassin' },
  { value: 'shaman', label: 'Shaman' },
]
const CATEGORIES: { value: StockCategory, label: string }[] = [
  { value: 'combat', label: 'Combat' },
  { value: 'party-ui', label: 'Party UI' },
  { value: 'raid', label: 'Raid' },
  { value: 'lootrun', label: 'Lootrun' },
  { value: 'dps-meter', label: 'DPS meter' },
  { value: 'cooldown-tracker', label: 'Cooldowns' },
  { value: 'resource-tracker', label: 'Resources' },
  { value: 'qol', label: 'QoL' },
]
const SORTS: { value: StockSort, label: string }[] = [
  { value: 'latest-activity', label: 'Latest activity' },
  { value: 'most-installed', label: 'Most installed' },
  { value: 'most-reacted', label: 'Most reacted' },
  { value: 'newest', label: 'Newest' },
  { value: 'recently-updated', label: 'Recently updated' },
]

// SearchSortBar contract is newest/oldest/name; stock has its own richer sort
// set, so we use a native select in the search row and keep SearchSortBar's
// search field via a thin wrapper below. To stay simple here, drive both
// query and stock-sort directly.
const q = computed(() => (route.query.q as string) || '')
const sort = computed<StockSort>(() => {
  const s = route.query.sort as string
  return (SORTS.find(o => o.value === s)?.value) ?? 'latest-activity'
})
const activeKind = computed<StockKind | ''>(() => (route.query.kind as StockKind) || '')
const activeClass = computed<StockClass | ''>(() => (route.query.class as StockClass) || '')
const activeCategory = computed<StockCategory | ''>(() => (route.query.category as StockCategory) || '')
const activeCreator = computed(() => (route.query.creator as string) || '')

function setFilter(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, cursor: undefined } })
}

function onQ(val: string) {
  setFilter({ q: val || undefined })
}
function onSort(val: StockSort) {
  setFilter({ sort: val === 'latest-activity' ? undefined : val })
}
function toggleKind(k: StockKind) {
  setFilter({ kind: activeKind.value === k ? undefined : k })
}
function toggleClass(c: StockClass) {
  setFilter({ class: activeClass.value === c ? undefined : c })
}
function toggleCategory(c: StockCategory) {
  setFilter({ category: activeCategory.value === c ? undefined : c })
}

// Debounced search input local state
const searchInput = ref(q.value)
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(q, v => searchInput.value = v)
function onSearchInput(e: Event) {
  searchInput.value = (e.target as HTMLInputElement).value
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(onQ, 300, searchInput.value)
}

// Creator picker (mirrors /builds)
const creatorInput = ref('')
const creatorOpen = ref(false)
const creatorSuggestions = ref<ApiUserSearchResult[]>([])
const creatorSearching = ref(false)
const creatorSearchedFor = ref('')
const selectedCreator = ref<{ id: string, username: string, name: string, avatar: string | null } | null>(null)
let creatorDebounce: ReturnType<typeof setTimeout> | null = null

async function runCreatorSearch(needle: string) {
  creatorSearching.value = true
  try {
    const res = await profileApi.searchUsers(needle)
    if (creatorInput.value.trim() === needle) {
      creatorSuggestions.value = res.data
      creatorSearchedFor.value = needle
    }
  }
  catch {
    creatorSuggestions.value = []
  }
  finally {
    creatorSearching.value = false
  }
}

function onCreatorInput() {
  creatorOpen.value = true
  if (creatorDebounce)
    clearTimeout(creatorDebounce)
  const needle = creatorInput.value.trim()
  if (needle.length < 2) {
    creatorSuggestions.value = []
    creatorSearchedFor.value = ''
    return
  }
  creatorDebounce = setTimeout(runCreatorSearch, 180, needle)
}

function selectCreator(u: ApiUserSearchResult) {
  selectedCreator.value = u
  creatorInput.value = u.name
  creatorOpen.value = false
  setFilter({ creator: u.id })
}
function clearCreator() {
  selectedCreator.value = null
  creatorInput.value = ''
  creatorSuggestions.value = []
  creatorSearchedFor.value = ''
  setFilter({ creator: undefined })
}
function onCreatorBlur() {
  setTimeout(() => {
    creatorOpen.value = false
  }, 150)
}

watch(activeCreator, async (id) => {
  if (!id) {
    selectedCreator.value = null
    creatorInput.value = ''
    return
  }
  if (selectedCreator.value?.id === id)
    return
  try {
    const prof = await profileApi.getProfile(id)
    if ('private' in prof)
      selectedCreator.value = { id, username: id, name: id, avatar: null }
    else
      selectedCreator.value = { id: prof.id, username: prof.username, name: prof.name, avatar: prof.avatar }
    creatorInput.value = selectedCreator.value.name
  }
  catch {
    selectedCreator.value = { id, username: id, name: id, avatar: null }
    creatorInput.value = id
  }
}, { immediate: true })

// ── List state ───────────────────────────────────────────────────────────
const items = ref<StockListItem[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const filters = computed<ListFilters>(() => ({
  q: q.value || undefined,
  sort: sort.value,
  kind: activeKind.value || undefined,
  class: activeClass.value || undefined,
  category: activeCategory.value || undefined,
  creator: activeCreator.value || undefined,
}))

async function load(cursor?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await api.list({ ...filters.value, cursor, limit: 24 })
    items.value = cursor ? [...items.value, ...res.items] : res.items
    nextCursor.value = res.nextCursor
  }
  catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load creations.'
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

await useAsyncData('public-stock', () => load())

const hasActiveFilters = computed(() => !!(
  q.value || activeKind.value || activeClass.value || activeCategory.value || activeCreator.value
))

function clearAllFilters() {
  router.push({ query: {} })
}

const _sortBarShape = (val: SortOption) => val
void _sortBarShape
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <span class="toolbar-title">Stock</span>
      <p class="page-desc">
        Info boxes, custom bars and bundles shared by the community.
      </p>
      <NuxtLink to="/stock/new" class="page-cta">
        + New creation
      </NuxtLink>
    </div>

    <div class="layout">
      <FiltersSidebar panel-id="stock-filters-panel">
        <div class="filters">
          <div class="search-row">
            <div class="search-wrap">
              <svg class="search-icon" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.3" />
                <path d="M9 9l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
              </svg>
              <input
                class="search-input"
                type="search"
                placeholder="Search by name…"
                :value="searchInput"
                @input="onSearchInput"
              >
            </div>
            <select
              class="sort-select"
              :value="sort"
              aria-label="Sort"
              @change="onSort(($event.target as HTMLSelectElement).value as StockSort)"
            >
              <option v-for="s in SORTS" :key="s.value" :value="s.value">
                {{ s.label }}
              </option>
            </select>
          </div>

          <fieldset class="f-group f-group--col">
            <legend>Kind</legend>
            <div class="chip-row">
              <button
                v-for="k in KINDS"
                :key="k.value"
                type="button"
                :class="{ on: activeKind === k.value }"
                @click="toggleKind(k.value)"
              >
                {{ k.label }}
              </button>
            </div>
          </fieldset>

          <fieldset class="f-group f-group--class">
            <legend>Class</legend>
            <button
              v-for="cls in CLASSES"
              :key="cls.value"
              type="button"
              :class="{ on: activeClass === cls.value }"
              :style="{ '--cls-color': CLASS_THEMES[cls.label]?.color }"
              @click="toggleClass(cls.value)"
            >
              <img :src="classWeaponUrl(cls.label)" class="cls-icon" alt="" aria-hidden="true">
              {{ cls.label }}
            </button>
          </fieldset>

          <fieldset class="f-group f-group--col">
            <legend>Category</legend>
            <div class="chip-row">
              <button
                v-for="c in CATEGORIES"
                :key="c.value"
                type="button"
                :class="{ on: activeCategory === c.value }"
                @click="toggleCategory(c.value)"
              >
                {{ c.label }}
              </button>
            </div>
          </fieldset>

          <fieldset class="f-group f-group--col">
            <legend>Created by</legend>
            <div class="item-picker">
              <div class="item-picker-wrap">
                <img
                  v-if="selectedCreator?.avatar"
                  :src="selectedCreator.avatar"
                  class="item-selected-icon item-selected-icon--avatar"
                  aria-hidden="true"
                  alt=""
                >
                <input
                  v-model="creatorInput"
                  class="item-input"
                  :class="{ 'item-input--has-icon': !!selectedCreator?.avatar }"
                  type="text"
                  placeholder="Filter by user…"
                  autocomplete="off"
                  @focus="creatorOpen = true"
                  @blur="onCreatorBlur"
                  @input="onCreatorInput"
                >
                <button v-if="activeCreator" class="item-clear" type="button" aria-label="Clear creator filter" @click="clearCreator">
                  ×
                </button>
              </div>
              <ul v-if="creatorOpen && creatorSuggestions.length" class="item-suggestions">
                <li
                  v-for="u in creatorSuggestions"
                  :key="u.id"
                  class="item-suggestion"
                  @mousedown.prevent="selectCreator(u)"
                >
                  <img
                    v-if="u.avatar"
                    :src="u.avatar"
                    class="item-suggestion-icon item-suggestion-icon--avatar"
                    aria-hidden="true"
                    alt=""
                  >
                  <span v-else class="item-suggestion-icon item-suggestion-icon--empty" aria-hidden="true" />
                  <span class="creator-name">{{ u.name }}</span>
                </li>
              </ul>
              <ul
                v-else-if="creatorOpen && creatorInput.trim().length >= 2 && !creatorSearching && creatorSearchedFor === creatorInput.trim()"
                class="item-suggestions"
              >
                <li class="creator-empty">
                  No users found.
                </li>
              </ul>
            </div>
          </fieldset>
        </div>
      </FiltersSidebar>

      <section class="results">
        <header class="results-head">
          <span class="count">{{ items.length.toLocaleString() }} {{ items.length === 1 ? 'creation' : 'creations' }}</span>
          <span v-if="loading && items.length === 0" class="count count--dim">loading…</span>
        </header>

        <p v-if="loadError" class="state">
          {{ loadError }}
        </p>
        <div v-else-if="items.length === 0 && !loading && hasActiveFilters" class="state-block">
          <span>No creations match these filters.</span>
          <button type="button" class="state-action" @click="clearAllFilters">
            Clear filters
          </button>
        </div>
        <div v-else-if="items.length === 0 && !loading" class="state-block">
          <span>Nothing in the library yet.</span>
          <NuxtLink to="/stock/new" class="state-action">
            Be the first to share
          </NuxtLink>
        </div>
        <template v-else>
          <div class="card-grid">
            <StockCard v-for="item in items" :key="item.id" :item="item" />
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

.toolbar-title {
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text);
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.search-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 140px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--color-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 10px 7px 30px;
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.12s ease-out;
}
.search-input::placeholder {
  color: var(--color-muted);
}
.search-input:focus {
  border-color: var(--color-accent);
}
.search-input::-webkit-search-cancel-button {
  display: none;
}

.sort-select {
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 7px 10px;
  cursor: pointer;
  transition: border-color 0.12s ease-out;
  outline: none;
}
.sort-select:focus {
  border-color: var(--color-accent);
}

/* Chip rows wrap to multiple lines naturally inside f-group--col */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Class filter buttons mirror /builds */
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

/* Creator picker (shared shape with /builds) */
.item-picker {
  position: relative;
}
.item-picker-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.item-selected-icon {
  position: absolute;
  left: 8px;
  width: 18px;
  height: 18px;
  pointer-events: none;
}
.item-selected-icon--avatar {
  border-radius: 50%;
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
.item-input--has-icon {
  padding-left: 32px;
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.1s ease-out;
}
.item-suggestion:hover {
  background: var(--color-surface-hi);
}
.item-suggestion-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.item-suggestion-icon--avatar {
  border-radius: 50%;
}
.item-suggestion-icon--empty {
  visibility: hidden;
}
.creator-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.creator-empty {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  cursor: default;
  list-style: none;
  padding: 8px 10px;
}

.results-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  height: 22px;
}
.count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
}
.count--dim {
  color: var(--color-muted);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 720px) {
  .page {
    padding: 12px 0 48px;
  }
  .toolbar {
    padding-bottom: 14px;
    margin-bottom: 16px;
    gap: 12px;
  }
  .page-desc {
    display: none;
  }
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }
}
</style>
