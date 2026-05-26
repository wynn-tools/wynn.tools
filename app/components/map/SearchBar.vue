<script setup lang="ts">
import type { MapFeature } from '~/types/map'
import { ref, watch } from 'vue'
import { addRecent, getRecents } from '~/composables/useRecents'
import { parseCoords, search } from '~/composables/useSearch'
import { getWorld } from '~/config/worlds'
import { useMapStore } from '~/stores/map'

defineProps<{ navbar?: boolean }>()
const store = useMapStore()
const query = ref('')
const includeServices = ref(true)
const results = ref<any[]>([])
const open = ref(false)
const activeIndex = ref(-1)
const recents = ref<MapFeature[]>([])
let skipNextSearch = false

function onFocus() {
  recents.value = getRecents()
  open.value = query.value ? results.value.length > 0 : recents.value.length > 0
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (q) => {
  if (skipNextSearch) {
    skipNextSearch = false
    return
  }
  if (debounceTimer)
    clearTimeout(debounceTimer)
  if (!q) {
    results.value = []
    open.value = recents.value.length > 0
    return
  }
  debounceTimer = setTimeout(() => {
    const coords = parseCoords(q)
    if (coords) {
      results.value = [
        { _coord: true, x: coords.x, z: coords.z, label: `${coords.x}, ${coords.z}` },
      ]
    }
    else {
      results.value = search(q, { includeServices: includeServices.value })
    }
    open.value = results.value.length > 0
  }, 80)
})

watch(results, () => {
  activeIndex.value = -1
})

function selectResult(r: any) {
  open.value = false
  skipNextSearch = true
  if (r._coord) {
    query.value = ''
    store.setCoordPin({ x: r.x, z: r.z })
    store.setCenter(r.x, r.z)
    store.setFocus(null)
    return
  }
  query.value = r.label
  if (r.worldId && r.worldId !== store.world)
    store.setWorld(r.worldId)
  store.setCenter(r.location.x, r.location.z)
  store.setFocus(r.featureId)
  addRecent(r)
}

function onBlur() {
  setTimeout(() => {
    open.value = false
  }, 150)
}

function onSearchKeydown(e: KeyboardEvent) {
  const list = query.value ? results.value : recents.value
  if (e.key === 'ArrowDown') {
    activeIndex.value = Math.min(activeIndex.value + 1, list.length - 1)
    e.preventDefault()
  }
  else if (e.key === 'ArrowUp') {
    activeIndex.value = Math.max(activeIndex.value - 1, -1)
    e.preventDefault()
  }
  else if (e.key === 'Enter' && activeIndex.value >= 0) {
    selectResult(list[activeIndex.value])
    e.preventDefault()
  }
  else if (e.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="relative" :class="[navbar ? 'flex-1 min-w-0' : 'w-72']">
    <input
      v-model="query"
      type="text"
      placeholder="Search places, caves... or paste coords"
      aria-label="Search map features"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      :aria-expanded="open"
      class="w-full rounded-md bg-bg/90 px-3 py-2 text-sm text-copper placeholder:text-muted/60 backdrop-blur ring-1 ring-copper/20 focus:outline-none focus:ring-copper/60"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onSearchKeydown"
    >
    <div
      v-if="open"
      class="absolute z-[500] mt-1 w-full overflow-y-auto rounded-md bg-bg/95 p-1 shadow-lg ring-1 ring-copper/20 backdrop-blur"
      style="max-height: 20rem"
    >
      <!-- Recents (query is empty) -->
      <template v-if="!query && recents.length">
        <p
          class="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/40"
        >
          Recent
        </p>
        <ul role="listbox" aria-label="Recent markers">
          <li
            v-for="(r, i) in recents"
            :key="r.featureId"
            role="option"
            :aria-selected="i === activeIndex"
            class="cursor-pointer rounded px-2 py-1.5 text-sm" :class="[
              i === activeIndex
                ? 'bg-copper/10 text-copper'
                : 'text-muted hover:bg-copper/10 hover:text-copper',
            ]"
            @mousedown.prevent="selectResult(r)"
          >
            <div class="flex items-center justify-between gap-2">
              <span>{{ r.label }}</span>
              <span v-if="r.level" class="text-xs opacity-60">Lv {{ r.level }}</span>
            </div>
            <div
              v-if="r.worldId && r.worldId !== 'main'"
              class="text-[10px] uppercase tracking-wider opacity-60"
            >
              {{ getWorld(r.worldId).label }}
            </div>
          </li>
        </ul>
      </template>

      <!-- Search results (query is non-empty) -->
      <ul v-else role="listbox" aria-label="Search results">
        <li
          v-for="(r, i) in results"
          :key="r._coord ? `coord-${r.label}` : r.featureId"
          role="option"
          :aria-selected="i === activeIndex"
          class="cursor-pointer rounded px-2 py-1.5 text-sm" :class="[
            i === activeIndex
              ? 'bg-copper/10 text-copper'
              : 'text-muted hover:bg-copper/10 hover:text-copper',
          ]"
          @mousedown.prevent="selectResult(r)"
        >
          <div v-if="r._coord" class="flex items-center gap-1.5">
            <span class="opacity-50">⌖</span>
            <span>Jump to {{ r.label }}</span>
          </div>
          <template v-else>
            <div class="flex items-center justify-between gap-2">
              <span>{{ r.label }}</span>
              <span v-if="r.level" class="text-xs opacity-60">Lv {{ r.level }}</span>
            </div>
            <div class="text-[10px] opacity-60">
              <span v-if="r.nearestPlace">{{ r.nearestPlace }}</span>
              <span v-else-if="r.worldId && r.worldId !== 'main'" class="uppercase tracking-wider">
                {{ getWorld(r.worldId).label }}
              </span>
            </div>
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>
