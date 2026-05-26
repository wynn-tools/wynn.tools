<script setup lang="ts">
import type { MapCategory, MapFeature } from '~/types/map'
import { computed, ref } from 'vue'
import { getDatasetLevelRange } from '~/composables/useLevelIndex'
import {
  CATEGORIES,
  defaultEnabledCategories,
  getCategory,
  getChildCategories,
} from '~/config/categories'
import { useMapStore } from '~/stores/map'

const props = defineProps<{ features: MapFeature[], mobileOpen?: boolean }>()
const emit = defineEmits<{ 'update:mobileOpen': [v: boolean] }>()
const store = useMapStore()
const collapsed = ref(false)

const enabledCount = computed(() => store.enabledCategories.length)
const totalCount = computed(() => CATEGORIES.filter(c => !c.virtual).length)

interface DisplayItem {
  cat: MapCategory
  depth: number
  children: MapCategory[]
}

const countByCat = computed(() => {
  const m = new Map<string, number>()
  for (const f of props.features) {
    m.set(f.categoryId, (m.get(f.categoryId) ?? 0) + 1)
  }
  return m
})

function buildDisplayItems(cats: MapCategory[]): DisplayItem[] {
  const result: DisplayItem[] = []
  for (const cat of cats) {
    const parentIsVirtual
      = cat.parentId !== null && cats.find(c => c.id === cat.parentId)?.virtual === true
    if (parentIsVirtual)
      continue
    const children = cat.virtual ? getChildCategories(cat.id) : []
    result.push({ cat, depth: 0, children })
    for (const child of children) {
      result.push({ cat: child, depth: 1, children: [] })
    }
  }
  return result
}

const groups = computed(() => {
  const places = CATEGORIES.filter(c => c.id.startsWith('wynntils:place:'))
  const content = CATEGORIES.filter(c => c.id.startsWith('wynntils:content:'))
  const services = CATEGORIES.filter(c => c.id.startsWith('wynntils:service:'))
  return [
    { label: 'Places', items: buildDisplayItems(places) },
    { label: 'Content', items: buildDisplayItems(content) },
    { label: 'Services', items: buildDisplayItems(services) },
  ]
})

function itemChecked(item: DisplayItem): boolean {
  if (item.children.length > 0) {
    return item.children.every(c => store.enabledCategories.includes(c.id))
  }
  return store.enabledCategories.includes(item.cat.id)
}

function itemIndeterminate(item: DisplayItem): boolean {
  if (item.children.length === 0)
    return false
  const on = item.children.filter(c => store.enabledCategories.includes(c.id)).length
  return on > 0 && on < item.children.length
}

function itemCount(item: DisplayItem): number {
  if (item.children.length > 0) {
    return item.children.reduce((sum, c) => sum + (countByCat.value.get(c.id) ?? 0), 0)
  }
  return countByCat.value.get(item.cat.id) ?? 0
}

function itemZoomGated(item: DisplayItem): boolean {
  if (!itemChecked(item))
    return false
  const cats = item.children.length > 0 ? item.children : [item.cat]
  return cats.every((c) => {
    const cat = getCategory(c.id)
    return cat ? store.zoom < cat.minZoom : false
  })
}

const CONTENT_PREFIX = 'wynntils:content:'

const hasContentEnabled = computed(() =>
  store.enabledCategories.some(id => id.startsWith(CONTENT_PREFIX)),
)

const datasetRange = getDatasetLevelRange()

const levelRange = computed({
  get: (): [number, number] => store.levelRange ?? [datasetRange.min, datasetRange.max],
  set: (v: [number, number]) => {
    const { min, max } = datasetRange
    store.setLevelRange(v[0] === min && v[1] === max ? null : v)
  },
})

function reset() {
  store.setEnabledCategories(defaultEnabledCategories())
  store.setLevelRange(null)
}
</script>

<template>
  <!-- Desktop left rail -->
  <div class="pointer-events-auto absolute left-4 top-4 z-[400] hidden md:flex">
    <div
      v-if="!collapsed"
      class="max-h-[calc(100vh-9rem)] w-64 overflow-y-auto rounded-lg bg-bg/95 p-3 shadow-xl ring-1 ring-copper/20 backdrop-blur"
    >
      <header class="mb-2 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-copper">
          Filters
        </h3>
        <div class="flex items-center gap-1">
          <button type="button" class="text-xs text-muted hover:text-copper" @click="reset">
            Reset
          </button>
          <button
            type="button"
            class="rounded p-1 text-muted transition-colors hover:text-copper"
            aria-label="Collapse filters"
            @click="collapsed = true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M11 19l-7-7 7-7" />
              <path d="M18 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </header>

      <div v-if="hasContentEnabled" class="mb-3 border-b border-border pb-3">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-muted/60">Level Range</span>
          <span class="text-[10px] tabular-nums text-muted/60">
            {{ levelRange[0] }}–{{ levelRange[1] }}
          </span>
        </div>
        <SliderRoot
          v-model="levelRange"
          :min="datasetRange.min"
          :max="datasetRange.max"
          :step="1"
          class="relative flex w-full touch-none select-none items-center py-1"
        >
          <SliderTrack class="relative h-1 w-full grow overflow-hidden rounded-full bg-border">
            <SliderRange class="absolute h-full bg-copper/70" />
          </SliderTrack>
          <SliderThumb
            v-for="_ in 2"
            :key="_"
            class="block h-3.5 w-3.5 rounded-full border border-copper/60 bg-bg shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/50"
          />
        </SliderRoot>
      </div>

      <section v-for="g in groups" :key="g.label" class="mb-3">
        <h4 class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
          {{ g.label }}
        </h4>
        <ul class="space-y-0.5">
          <li
            v-for="item in g.items"
            :key="item.cat.id"
            class="flex items-center justify-between gap-2 text-sm" :class="[item.depth > 0 && 'pl-4']"
          >
            <label class="flex flex-1 cursor-pointer items-center gap-2 py-0.5">
              <input
                type="checkbox"
                :checked="itemChecked(item)"
                :indeterminate="itemIndeterminate(item)"
                class="accent-copper"
                @change="store.toggleCategory(item.cat.id)"
              >
              <span
                class="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                :style="{ background: item.cat.color }"
              />
              <img :src="item.cat.icon" alt="" class="h-4 w-4 flex-shrink-0 object-contain">
              <span class="truncate text-muted">{{ item.cat.label }}</span>
            </label>
            <span
              v-if="itemZoomGated(item)"
              title="Zoom in to see these markers"
              class="flex-shrink-0 text-[10px] text-muted/50"
            >zoom in</span>
            <span v-else class="flex-shrink-0 text-[10px] text-muted/50">
              {{ itemCount(item) }}
            </span>
          </li>
        </ul>
      </section>
    </div>

    <button
      v-if="collapsed"
      type="button"
      class="flex flex-col items-center gap-1.5 rounded-r-lg bg-bg/95 px-2 py-3 ring-1 ring-copper/20 backdrop-blur transition-colors hover:bg-bg"
      aria-label="Open filters"
      @click="collapsed = false"
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
        class="text-copper"
        aria-hidden="true"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      <span class="text-[10px] font-bold tabular-nums text-copper">{{ enabledCount }}</span>
      <span class="text-[8px] font-semibold uppercase tracking-wide text-muted/50">/{{ totalCount }}</span>
    </button>
  </div>

  <!-- Mobile bottom sheet -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="mobileOpen"
        class="md:hidden fixed inset-x-0 bottom-0 z-[600] max-h-[70vh] overflow-y-auto rounded-t-2xl bg-bg p-4 shadow-2xl ring-1 ring-copper/20"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-copper">
            Filters
          </h3>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-xs text-muted hover:text-copper"
              @click="reset"
            >
              Reset
            </button>
            <MapCloseBtn aria-label="Close filters" @click="emit('update:mobileOpen', false)" />
          </div>
        </div>

        <div v-if="hasContentEnabled" class="mb-3 border-b border-border pb-3">
          <div class="mb-1.5 flex items-center justify-between">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-muted/60">Level Range</span>
            <span class="text-[10px] tabular-nums text-muted/60">
              {{ levelRange[0] }}–{{ levelRange[1] }}
            </span>
          </div>
          <SliderRoot
            v-model="levelRange"
            :min="datasetRange.min"
            :max="datasetRange.max"
            :step="1"
            class="relative flex w-full touch-none select-none items-center py-1"
          >
            <SliderTrack
              class="relative h-1 w-full grow overflow-hidden rounded-full bg-border"
            >
              <SliderRange class="absolute h-full bg-copper/70" />
            </SliderTrack>
            <SliderThumb
              v-for="_ in 2"
              :key="_"
              class="block h-3.5 w-3.5 rounded-full border border-copper/60 bg-bg shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/50"
            />
          </SliderRoot>
        </div>

        <section v-for="g in groups" :key="g.label" class="mb-3">
          <h4 class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/60">
            {{ g.label }}
          </h4>
          <ul class="space-y-0.5">
            <li
              v-for="item in g.items"
              :key="item.cat.id"
              class="flex items-center justify-between gap-2 text-sm" :class="[item.depth > 0 && 'pl-4']"
            >
              <label class="flex flex-1 cursor-pointer items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  :checked="itemChecked(item)"
                  :indeterminate="itemIndeterminate(item)"
                  class="accent-copper"
                  @change="store.toggleCategory(item.cat.id)"
                >
                <span
                  class="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  :style="{ background: item.cat.color }"
                />
                <img :src="item.cat.icon" alt="" class="h-4 w-4 flex-shrink-0 object-contain">
                <span class="truncate text-muted">{{ item.cat.label }}</span>
              </label>
              <span
                v-if="itemZoomGated(item)"
                title="Zoom in to see these markers"
                class="flex-shrink-0 text-[10px] text-muted/50"
              >zoom in</span>
              <span v-else class="flex-shrink-0 text-[10px] text-muted/50">
                {{ itemCount(item) }}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
