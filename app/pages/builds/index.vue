<script setup lang="ts">
import type { SortOption } from '~/components/SearchSortBar.vue'
import type { ApiBuildSummary, ApiUserSearchResult, BuildListFilters } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'
import { useGameVersions } from '~/composables/useGameVersions'
import { useItemSearchData } from '~/composables/useItemSearchData'
import { CLASS_THEMES, classWeaponUrl } from '~/lib/build/class-theme'
import { itemIconUrl } from '~/lib/items/icon'

useSeoMeta({
  title: 'Public Builds — wynn.tools',
  ogTitle: 'Public Builds — wynn.tools',
  description: 'Browse Wynncraft builds shared by the community.',
  ogDescription: 'Browse Wynncraft builds shared by the community.',
  twitterCard: 'summary_large_image',
})

const route = useRoute()
const router = useRouter()
const api = useApi()

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
// gameVersion URL semantics:
//   absent  → latest only (default)
//   'any'   → no version filter (user expanded picker, chose Any)
//   'X.Y.Z' → exact match on that version
const activeGameVersion = computed(() => (route.query.gameVersion as string) || '')
const activeCreator = computed(() => (route.query.creator as string) || '')
const activeTags = computed<string[]>(() => {
  const t = route.query.tag
  if (!t)
    return []
  return Array.isArray(t) ? t.map(String) : [String(t)]
})

// --- game versions ---
const { data: versionsData } = useGameVersions()
const latestVersion = computed(() => versionsData.value?.latest ?? null)
const allVersions = computed(() => versionsData.value?.all ?? [])

const latestOnly = computed(() => !activeGameVersion.value)
const versionPickerExpanded = computed(() => !latestOnly.value)
const versionSelectValue = computed(() => activeGameVersion.value === 'any' ? '' : activeGameVersion.value)

function toggleLatestOnly() {
  // Toggle off → "any version" sentinel; toggle on → clear param.
  setFilter({ gameVersion: latestOnly.value ? 'any' : undefined })
}

function onVersionSelect(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  // Empty option ("Any version") keeps the expanded state via the 'any' sentinel.
  setFilter({ gameVersion: v || 'any' })
}

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
const selectedItem = computed(() => {
  if (!activeItemId.value || !searchData.value)
    return null
  return searchData.value.items.find(i => i.id === activeItemId.value) ?? null
})
const selectedItemName = computed(() => selectedItem.value?.name ?? null)

function selectItem(id: number, name: string) {
  itemPickerInput.value = name
  itemPickerOpen.value = false
  setFilter({ itemId: String(id) })
}
function clearItem() {
  itemPickerInput.value = ''
  setFilter({ itemId: undefined })
}

function onItemBlur() {
  setTimeout(() => {
    itemPickerOpen.value = false
  }, 150)
}

// --- creator picker state ---
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
    const res = await api.searchUsers(needle)
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

// If URL deep-links a creator id we don't know yet, resolve a display name once.
watch(activeCreator, async (id) => {
  if (!id) {
    selectedCreator.value = null
    creatorInput.value = ''
    return
  }
  if (selectedCreator.value?.id === id)
    return
  try {
    const prof = await api.getProfile(id)
    if ('private' in prof) {
      selectedCreator.value = { id, username: id, name: id, avatar: null }
    }
    else {
      selectedCreator.value = { id: prof.id, username: prof.username, name: prof.name, avatar: prof.avatar }
    }
    creatorInput.value = selectedCreator.value.name
  }
  catch {
    selectedCreator.value = { id, username: id, name: id, avatar: null }
    creatorInput.value = id
  }
}, { immediate: true })

// --- filter update helpers ---
function setFilter(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, cursor: undefined } })
}

function setTags(tags: string[]) {
  router.push({ query: { ...route.query, tag: tags.length > 0 ? tags : undefined, cursor: undefined } })
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
const builds = ref<ApiBuildSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const filters = computed<BuildListFilters>(() => {
  // Latest-only (no param) pins to the latest version; 'any' sentinel removes
  // the filter entirely; anything else is an exact version match.
  let gv: string | undefined
  if (latestOnly.value)
    gv = latestVersion.value ?? undefined
  else if (activeGameVersion.value !== 'any')
    gv = activeGameVersion.value
  return {
    q: q.value || undefined,
    sort: sort.value,
    class: (activeClass.value as BuildListFilters['class']) || undefined,
    itemId: activeItemId.value ?? undefined,
    gameVersion: gv || undefined,
    creator: activeCreator.value || undefined,
    tag: activeTags.value.length > 0 ? activeTags.value : undefined,
  }
})

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

const hasActiveFilters = computed(() => !!(
  q.value
  || activeClass.value
  || activeItemId.value
  || (activeGameVersion.value && activeGameVersion.value !== 'any')
  || activeCreator.value
))

function clearAllFilters() {
  router.push({ query: {} })
}
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
      <p class="page-desc">
        Community builds — hover any card for a stat preview.
      </p>
      <NuxtLink to="/builder" class="page-cta">
        New build
      </NuxtLink>
    </div>

    <div class="layout">
      <FiltersSidebar panel-id="builds-filters-panel">
        <div class="filters">
          <SearchSortBar :q="q" :sort="sort" @update:q="onQ" @update:sort="onSort" />

          <fieldset class="f-group f-group--col">
            <legend>Game Version</legend>
            <label class="version-toggle">
              <input
                type="checkbox"
                :checked="latestOnly"
                @change="toggleLatestOnly"
              >
              <span class="version-toggle-label">Latest patch only</span>
              <span v-if="latestVersion" class="version-toggle-hint">({{ latestVersion }})</span>
            </label>
            <select
              v-if="versionPickerExpanded"
              class="version-select"
              :value="versionSelectValue"
              title="Matches builds tagged with the selected game version."
              @change="onVersionSelect"
            >
              <option value="">
                Any version
              </option>
              <option
                v-for="v in allVersions"
                :key="v"
                :value="v"
              >
                {{ v }}{{ v === latestVersion ? ' · latest' : '' }}
              </option>
            </select>
          </fieldset>

          <fieldset class="f-group f-group--col">
            <legend>Tags</legend>
            <BuildsTagFilterStrip :active="activeTags" @change="setTags" />
          </fieldset>

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
            <legend title="Matches builds owned by, or credited to, this user.">
              Created By
            </legend>
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
                  class="item-suggestion creator-suggestion"
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
                <li class="item-suggestion creator-empty">
                  No users found.
                </li>
              </ul>
            </div>
          </fieldset>

          <fieldset class="f-group f-group--col">
            <legend>Item</legend>
            <div class="item-picker">
              <div class="item-picker-wrap">
                <img
                  v-if="selectedItem && itemIconUrl(selectedItem)"
                  :src="itemIconUrl(selectedItem)!"
                  class="item-selected-icon"
                  aria-hidden="true"
                  alt=""
                >
                <input
                  v-model="itemPickerInput"
                  class="item-input"
                  :class="{ 'item-input--has-icon': selectedItem && itemIconUrl(selectedItem) }"
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
                  <img
                    v-if="itemIconUrl(item)"
                    :src="itemIconUrl(item)!"
                    class="item-suggestion-icon"
                    aria-hidden="true"
                    alt=""
                  >
                  <span v-else class="item-suggestion-icon item-suggestion-icon--empty" aria-hidden="true" />
                  {{ item.name }}
                </li>
              </ul>
            </div>
          </fieldset>
        </div>
      </FiltersSidebar>

      <section class="results">
        <p v-if="loadError" class="state">
          {{ loadError }}
        </p>
        <div v-else-if="builds.length === 0 && !loading && hasActiveFilters" class="state-block">
          <span>No builds match these filters.</span>
          <button type="button" class="state-action" @click="clearAllFilters">
            Clear filters
          </button>
        </div>
        <div v-else-if="builds.length === 0 && !loading" class="state-block">
          <span>No builds shared yet.</span>
          <NuxtLink to="/builder" class="state-action">
            Create the first build
          </NuxtLink>
        </div>
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
              :owner-username="b.owner?.username"
              :show-owner="true"
              :tags="b.tags"
              :has-tutorial="b.hasTutorial"
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

/* Game Version */
.version-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.version-toggle input {
  accent-color: var(--color-accent);
  width: 14px;
  height: 14px;
  margin: 0;
  cursor: pointer;
}

.version-toggle-hint {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.06em;
  color: var(--color-faint);
}

.version-select {
  margin-top: 8px;
  width: 100%;
  padding: 7px 10px;
  font: 500 13px/1.4 var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.12s ease-out;
  cursor: pointer;
}

.version-select:focus {
  border-color: var(--color-accent);
}

/* Pickers (shared with Item) */
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
  image-rendering: pixelated;
  object-fit: contain;
  pointer-events: none;
  flex-shrink: 0;
}

.item-selected-icon--avatar {
  border-radius: 50%;
  image-rendering: auto;
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
  image-rendering: pixelated;
  object-fit: contain;
  flex-shrink: 0;
}

.item-suggestion-icon--avatar {
  border-radius: 50%;
  image-rendering: auto;
}

.item-suggestion-icon--empty {
  visibility: hidden;
}

/* Creator suggestion: name + handle */
.creator-suggestion {
  gap: 8px;
}

.creator-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-handle {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.04em;
  color: var(--color-faint);
  flex-shrink: 0;
}

.creator-empty {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  cursor: default;
}

.creator-empty:hover {
  background: transparent;
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
  }

  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }

  .page-desc {
    display: none;
  }
}
</style>
