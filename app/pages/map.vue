<script setup lang="ts">
import type { Map as LMap } from 'leaflet'
import type { FeatureDetail } from '~/composables/useFeatureDetails'
import type { CaveJsonEntry } from '~/composables/useMapData'
import type { SearchIngredient } from '~/lib/items-search/types'
import type { MapFeature, TerritoryEntry } from '~/types/map'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CategoryFilters from '~/components/map/CategoryFilters.vue'
import CoordReadout from '~/components/map/CoordReadout.vue'
import ExploreList from '~/components/map/ExploreList.vue'
import FocusPanel from '~/components/map/FocusPanel.vue'
import IngredientDropPanel from '~/components/map/IngredientDropPanel.vue'
import KeyboardShortcuts from '~/components/map/KeyboardShortcuts.vue'
import LootrunPanel from '~/components/map/LootrunPanel.vue'
import MapCanvas from '~/components/map/MapCanvas.vue'
import MapSkeleton from '~/components/map/MapSkeleton.vue'
import MapSources from '~/components/map/MapSources.vue'
import MobileControls from '~/components/map/MobileControls.vue'
import SearchBar from '~/components/map/SearchBar.vue'
import ServicePopup from '~/components/map/ServicePopup.vue'
import TerritoryLeaderboard from '~/components/map/TerritoryLeaderboard.vue'
import TerritoryPopup from '~/components/map/TerritoryPopup.vue'
import TerritoryToggle from '~/components/map/TerritoryToggle.vue'
import Toast from '~/components/map/Toast.vue'
import WorldEventPanel from '~/components/map/WorldEventPanel.vue'
import WorldEventsStrip from '~/components/map/WorldEventsStrip.vue'
import WorldPicker from '~/components/map/WorldPicker.vue'
import ZoomControls from '~/components/map/ZoomControls.vue'
import { detailFromFeature } from '~/composables/useFeatureDetails'
import { fitMobDrops } from '~/composables/useIngredientDropLayer'
import { buildLevelIndex } from '~/composables/useLevelIndex'
import { loadAllFeatures } from '~/composables/useMapData'
import {
  decodeQueryToView,
  encodeViewToQuery,
  loadFromLocalStorage,
  saveToLocalStorage,
} from '~/composables/useMapUrlSync'
import { shouldRenderMarker } from '~/composables/useMarkerLayer'
import { buildNearestPlaceIndex } from '~/composables/useNearestPlace'
import { addRecent } from '~/composables/useRecents'
import { buildIndexes } from '~/composables/useSearch'
import { ensureTerritoryData } from '~/composables/useTerritoryData'
import { useToast } from '~/composables/useToast'
import { useWorldEvents } from '~/composables/useWorldEvents'
import { useMapStore } from '~/stores/map'

definePageMeta({ layout: 'map', ssr: false })

useSeoMeta({
  title: 'Wynncraft Interactive Map — wynn.tools',
  description: 'Explore the world of Wynncraft — territories, caves, quests, and more.',
  ogTitle: 'Wynncraft Interactive Map — wynn.tools',
  ogDescription: 'Explore the world of Wynncraft — territories, caves, quests, and more.',
  twitterCard: 'summary_large_image',
})

const route = useRoute()
const router = useRouter()
const store = useMapStore()

const { data: searchData } = useItemSearchData()
const ingredientPalette = ref(new Map<string, string>())
const mapRef = shallowRef<LMap | null>(null)

const loading = ref(true)

const loadSteps = ref([
  { id: 'places', label: 'Places', done: false },
  { id: 'combat', label: 'Combat', done: false },
  { id: 'services', label: 'Services', done: false },
  { id: 'caves', label: 'Caves', done: false },
  { id: 'index', label: 'Index', done: false },
])

function markStep(id: string) {
  const step = loadSteps.value.find(s => s.id === id)
  if (step)
    step.done = true
}
const { push: pushToast } = useToast()
const lootrunPanelOpen = ref(false)
const eventsStripOpen = ref(true)
const selectedEvent = ref<import('~/types/map').WorldEvent | null>(null)
const eventsListMode = ref(false)
const { events: worldEvents, loading: eventsLoading, error: eventsError } = useWorldEvents()
const exploreOpen = ref(false)
const mobileFiltersOpen = ref(false)
const shortcutsOpen = ref(false)

const allFeatures = ref<MapFeature[]>([])
const caves = ref<CaveJsonEntry[]>([])
const servicePopup = ref<{ feature: MapFeature, screenPos: { x: number, y: number } } | null>(null)
const territoryPopup = ref<{
  territory: TerritoryEntry
  screenPos: { x: number, y: number }
} | null>(null)

const inViewCount = computed(() => {
  const bounds = store.viewBounds
  return allFeatures.value.filter((f) => {
    if (
      !shouldRenderMarker(f, {
        activeWorld: store.world,
        enabledCategories: store.enabledCategories,
        zoom: store.zoom,
        levelRange: store.levelRange,
      })
    ) {
      return false
    }
    if (!bounds)
      return true
    return (
      f.location.x >= bounds.x1
      && f.location.x <= bounds.x2
      && f.location.z >= bounds.z1
      && f.location.z <= bounds.z2
    )
  }).length
})

function onGlobalKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

  // / and Ctrl+K work everywhere
  if (e.key === '/') {
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[aria-label="Search map features"]',
    )
    if (document.activeElement !== searchInput) {
      e.preventDefault()
      searchInput?.focus()
    }
    return
  }
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    document.querySelector<HTMLInputElement>('input[aria-label="Search map features"]')?.focus()
    return
  }

  if (inInput)
    return

  if (e.key === '?') {
    shortcutsOpen.value = !shortcutsOpen.value
    return
  }
  if (e.key === '+' || e.key === '=') {
    store.setZoom(Math.min(store.zoom + 1, 4))
    return
  }
  if (e.key === '-') {
    store.setZoom(Math.max(store.zoom - 1, -3))
    return
  }
  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    }
    else {
      document.exitFullscreen()
    }
    return
  }
  if (e.key === 't' || e.key === 'T') {
    store.toggleTerritories()
    return
  }
  if (e.key === 'Escape') {
    if (!store.focus && !servicePopup.value && !territoryPopup.value && !shortcutsOpen.value && !store.ingredientDrop) {
      store.setCoordPin(null)
    }
  }
}

function onFullscreenChange() {
  store.setFullscreen(!!document.fullscreenElement)
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKey)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

const focusDetail = computed<FeatureDetail | null>(() => {
  if (!store.focus)
    return null
  const f = allFeatures.value.find(x => x.featureId === store.focus)
  if (!f)
    return null
  return detailFromFeature(f, caves.value)
})

const activeIngredient = computed<SearchIngredient | null>(() => {
  if (!store.ingredientDrop || !searchData.value)
    return null
  return searchData.value.ingredients.find(i => i.name === store.ingredientDrop) ?? null
})

onMounted(() => {
  if (route.query.s) {
    // Share code path — Task 27.
    return
  }
  const hasUrlParams = Object.keys(route.query).some(k =>
    ['world', 'x', 'z', 'zoom', 'cats', 'focus', 'fs', 'ing'].includes(k),
  )
  if (hasUrlParams) {
    store.hydrate(decodeQueryToView(route.query))
    return
  }
  const ls = loadFromLocalStorage()
  if (ls)
    store.hydrate(ls)
})

onMounted(async () => {
  try {
    const data = await loadAllFeatures(markStep)
    allFeatures.value = [...data.places, ...data.content, ...data.services]
    caves.value = data.caves
    buildNearestPlaceIndex(allFeatures.value)
    buildLevelIndex(allFeatures.value)
    await buildIndexes(allFeatures.value)
    markStep('index')
  }
  catch {
    pushToast('error', 'Failed to load map data. Please refresh.')
  }
  finally {
    loading.value = false
  }
})

let panTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => ({
    world: store.world,
    cx: store.center.x,
    cz: store.center.z,
    zoom: store.zoom,
    cats: store.enabledCategories.join(','),
    focus: store.focus,
    fs: store.fs,
    ing: store.ingredientDrop,
  }),
  (curr, prev) => {
    const panMoved = !prev || curr.cx !== prev.cx || curr.cz !== prev.cz || curr.zoom !== prev.zoom
    const writeUrl = () => {
      const view = {
        world: store.world,
        center: { x: store.center.x, z: store.center.z },
        zoom: store.zoom,
        cats: store.enabledCategories,
        focus: store.focus,
        fs: store.fs,
        ing: store.ingredientDrop,
      }
      router.replace({ query: encodeViewToQuery(view) })
      saveToLocalStorage({ ...view, ing: null })
    }
    if (panMoved) {
      if (panTimer)
        clearTimeout(panTimer)
      panTimer = setTimeout(writeUrl, 300)
    }
    else {
      writeUrl()
    }
  },
  { deep: true },
)

function onFeatureClick(featureId: string, screenPos: { x: number, y: number }) {
  const f = allFeatures.value.find(x => x.featureId === featureId)
  if (!f)
    return
  territoryPopup.value = null
  if (f.categoryId.startsWith('wynntils:service:')) {
    servicePopup.value = { feature: f, screenPos }
    store.setFocus(null)
  }
  else {
    servicePopup.value = null
    store.setFocus(featureId)
    addRecent(f)
  }
}

function onTerritoryClick(territory: TerritoryEntry, screenPos: { x: number, y: number }) {
  servicePopup.value = null
  territoryPopup.value = { territory, screenPos }
}

function onMapClick() {
  servicePopup.value = null
  territoryPopup.value = null
  store.setCoordPin(null)
}

const territoryEntries = ref<import('~/types/map').TerritoryEntry[]>([])

watch(
  () => store.showTerritories,
  async (active) => {
    if (active) {
      exploreOpen.value = false
      lootrunPanelOpen.value = false
      store.setFocus(null)
      servicePopup.value = null
      territoryPopup.value = null
      try {
        territoryEntries.value = await ensureTerritoryData()
      }
      catch {
        // non-fatal — leaderboard just won't show data
      }
    }
  },
)

// Close explore list when focus panel opens or lootrun panel opens
watch(
  () => store.focus,
  (f) => {
    if (f) {
      exploreOpen.value = false
      selectedEvent.value = null
      eventsListMode.value = false
    }
  },
)
watch(lootrunPanelOpen, (v) => {
  if (v) {
    exploreOpen.value = false
    store.setFocus(null)
    selectedEvent.value = null
    eventsListMode.value = false
  }
})
watch(exploreOpen, (v) => {
  if (v) {
    lootrunPanelOpen.value = false
    store.setFocus(null)
    selectedEvent.value = null
    eventsListMode.value = false
  }
})
watch(selectedEvent, (ev) => {
  if (ev) {
    store.setFocus(null)
    servicePopup.value = null
    territoryPopup.value = null
  }
})
watch(worldEvents, (fresh) => {
  if (selectedEvent.value && !fresh.some(e => e.internalName === selectedEvent.value!.internalName)) {
    selectedEvent.value = null
  }
})

const cursor = ref({ x: 0, z: 0 })
function onCursorMove(p: { x: number, z: number }) {
  cursor.value = p
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <!-- ── Map navbar ─────────────────────────────────── -->
    <header
      class="map-navbar relative z-[500] flex h-12 shrink-0 items-center gap-3 border-b border-border bg-bg/96 px-4 backdrop-blur-md"
    >
      <span class="navbar-scan" aria-hidden="true" />

      <!-- Home -->
      <a
        href="/"
        class="flex shrink-0 items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
        aria-label="Back to wynn.tools"
      >
        wynn.tools
      </a>

      <div class="h-5 w-px shrink-0 bg-border" aria-hidden="true" />

      <!-- Search (fills remaining space) -->
      <SearchBar :navbar="true" />

      <!-- Desktop controls -->
      <div class="hidden shrink-0 items-center gap-2 md:flex">
        <div class="h-5 w-px bg-border" aria-hidden="true" />
        <TerritoryToggle />
        <WorldPicker />
        <!-- Route button -->
        <MapNavBtn
          :active="lootrunPanelOpen"
          class="relative"
          :aria-pressed="lootrunPanelOpen"
          @click="lootrunPanelOpen = !lootrunPanelOpen"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="5" cy="6" r="2" />
            <path d="M7 6h4a4 4 0 0 1 4 4v2a4 4 0 0 0 4 4" />
            <circle cx="19" cy="18" r="2" />
          </svg>
          Route
          <span
            v-if="store.lootrun"
            class="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-copper shadow-[0_0_6px_oklch(62%_0.11_42_/_0.8)]"
            aria-label="Route active"
          />
        </MapNavBtn>

        <!-- In view -->
        <MapNavBtn
          :active="exploreOpen"
          :aria-pressed="exploreOpen"
          @click="exploreOpen = !exploreOpen"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span v-if="inViewCount > 0" class="tabular-nums">{{ inViewCount }}</span>
          in view
        </MapNavBtn>

        <!-- Events -->
        <MapNavBtn
          :active="eventsStripOpen"
          :aria-pressed="eventsStripOpen"
          @click="eventsStripOpen = !eventsStripOpen"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span v-if="worldEvents.length > 0" class="tabular-nums">{{ worldEvents.length }}</span>
          Events
        </MapNavBtn>
      </div>
    </header>

    <WorldEventsStrip
      v-if="eventsStripOpen"
      :events="worldEvents"
      :loading="eventsLoading"
      :error="eventsError"
      :selected-event="selectedEvent"
      @select="selectedEvent = $event; eventsListMode = false"
    />

    <!-- ── Map canvas ──────────────────────────────────── -->
    <div class="relative min-h-0 flex-1">
      <MapSkeleton v-if="loading" :steps="loadSteps" />
      <Toast />
      <MapCanvas
        :active-ingredient="activeIngredient"
        @ready="mapRef = $event"
        @feature-click="onFeatureClick"
        @territory-click="onTerritoryClick"
        @cursor-move="onCursorMove"
        @map-click="onMapClick"
        @event-marker-click="selectedEvent = $event; eventsListMode = false"
        @ingredient-palette-update="ingredientPalette = $event"
      />
      <div class="pointer-events-none absolute inset-0 z-[400]">
        <CategoryFilters
          :features="allFeatures"
          :mobile-open="mobileFiltersOpen"
          @update:mobile-open="mobileFiltersOpen = $event"
        />
        <TerritoryLeaderboard v-if="store.showTerritories" :territories="territoryEntries" />
        <LootrunPanel v-model="lootrunPanelOpen" />
        <ExploreList
          :features="allFeatures"
          :open="exploreOpen"
          @update:open="exploreOpen = $event"
        />
        <MobileControls
          @open-filters="mobileFiltersOpen = true"
          @open-events="eventsListMode = true; selectedEvent = null"
        />
        <FocusPanel :detail="focusDetail" />
        <WorldEventPanel
          :event="selectedEvent"
          :list-mode="eventsListMode"
          :all-events="worldEvents"
          @close="selectedEvent = null; eventsListMode = false"
        />
        <IngredientDropPanel
          :ingredient="activeIngredient"
          :palette="ingredientPalette"
          @fly-to-mob="mapRef && fitMobDrops(mapRef, $event)"
        />
        <ServicePopup
          :feature="servicePopup?.feature ?? null"
          :screen-pos="servicePopup?.screenPos ?? null"
          @close="servicePopup = null"
        />
        <TerritoryPopup
          :territory="territoryPopup?.territory ?? null"
          :screen-pos="territoryPopup?.screenPos ?? null"
          @close="territoryPopup = null"
        />
        <KeyboardShortcuts :open="shortcutsOpen" @close="shortcutsOpen = false" />
        <!-- Crosshair — mobile only, shows map center for coord reference -->
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center md:hidden"
          aria-hidden="true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            class="text-copper/60"
          >
            <line x1="10" y1="2" x2="10" y2="6" />
            <line x1="10" y1="14" x2="10" y2="18" />
            <line x1="2" y1="10" x2="6" y2="10" />
            <line x1="14" y1="10" x2="18" y2="10" />
            <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <div class="pointer-events-auto absolute bottom-4 left-4">
          <MapSources />
        </div>
        <div class="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-2">
          <ZoomControls
            @zoom-in="store.setZoom(Math.min(store.zoom + 1, 4))"
            @zoom-out="store.setZoom(Math.max(store.zoom - 1, -3))"
          />
          <CoordReadout :x="cursor.x" :z="cursor.z" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-navbar {
  position: relative;
}
.navbar-scan {
  position: absolute;
  inset-y: 0;
  left: 0;
  width: 35%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    oklch(62% 0.11 245 / 0.1) 40%,
    oklch(62% 0.11 245 / 0.18) 50%,
    oklch(62% 0.11 245 / 0.1) 60%,
    transparent 100%
  );
  animation: navbar-scan 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  pointer-events: none;
}
@keyframes navbar-scan {
  from {
    transform: translateX(-120%);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  to {
    transform: translateX(400%);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .navbar-scan {
    display: none;
  }
}
</style>
