<script setup lang="ts">
import type { MapCategory, MapFeature } from '~/types/map'
import { computed, onMounted, ref, watch } from 'vue'
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

const mobileOpenLocal = computed({
  get: () => props.mobileOpen ?? false,
  set: v => emit('update:mobileOpen', v),
})
const store = useMapStore()
const collapsed = ref(false)

const COLLAPSED_GROUPS_KEY = 'map.filters.collapsedGroups.v1'
const collapsedGroups = ref<Set<string>>(new Set())

onMounted(() => {
  try {
    const raw = localStorage.getItem(COLLAPSED_GROUPS_KEY)
    if (raw)
      collapsedGroups.value = new Set(JSON.parse(raw) as string[])
  }
  catch { /* ignore */ }
})

watch(collapsedGroups, (set) => {
  try {
    localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...set]))
  }
  catch { /* ignore */ }
}, { deep: true })

function toggleGroup(label: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(label))
    next.delete(label)
  else next.add(label)
  collapsedGroups.value = next
}

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

interface Group {
  label: string
  prefix: string
  items: DisplayItem[]
  leafIds: string[]
}

const groups = computed<Group[]>(() => {
  const make = (label: string, prefix: string): Group => {
    const cats = CATEGORIES.filter(c => c.id.startsWith(prefix))
    const items = buildDisplayItems(cats)
    const leafIds = cats.filter(c => !c.virtual).map(c => c.id)
    return { label, prefix, items, leafIds }
  }
  return [
    make('Places', 'wynntils:place:'),
    make('Content', 'wynntils:content:'),
    make('Services', 'wynntils:service:'),
  ]
})

function groupOnCount(group: Group): number {
  return group.leafIds.reduce(
    (n, id) => n + (store.enabledCategories.includes(id) ? 1 : 0),
    0,
  )
}

function groupAllOn(group: Group): boolean {
  return group.leafIds.every(id => store.enabledCategories.includes(id))
}

function groupAnyOn(group: Group): boolean {
  return group.leafIds.some(id => store.enabledCategories.includes(id))
}

function toggleGroupAll(group: Group, e: Event) {
  e.stopPropagation()
  const allOn = groupAllOn(group)
  if (allOn) {
    store.setEnabledCategories(
      store.enabledCategories.filter(id => !group.leafIds.includes(id)),
    )
  }
  else {
    const next = new Set(store.enabledCategories)
    for (const id of group.leafIds) next.add(id)
    store.setEnabledCategories([...next])
  }
}

const allOn = computed(() => {
  const allLeaves = CATEGORIES.filter(c => !c.virtual).map(c => c.id)
  return allLeaves.every(id => store.enabledCategories.includes(id))
})

const anyOn = computed(() => store.enabledCategories.length > 0)

function toggleAll() {
  if (allOn.value) {
    store.setEnabledCategories([])
  }
  else {
    const allLeaves = CATEGORIES.filter(c => !c.virtual).map(c => c.id)
    store.setEnabledCategories(allLeaves)
  }
}

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
      class="max-h-[calc(100vh-9rem)] w-72 overflow-y-auto rounded-lg bg-bg/95 p-3 shadow-xl ring-1 ring-accent/20 backdrop-blur"
    >
      <header class="mb-2 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-accent">
          Filters
        </h3>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
            :aria-pressed="anyOn"
            :title="allOn ? 'Turn all off' : 'Turn all on'"
            @click="toggleAll"
          >
            {{ allOn ? 'All off' : 'All on' }}
          </button>
          <span class="h-3 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            class="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-accent"
            @click="reset"
          >
            Reset
          </button>
          <button
            type="button"
            class="rounded p-1 text-muted transition-colors hover:text-accent"
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
          <span class="font-mono text-[10px] font-medium uppercase tracking-wider text-muted/70">Level Range</span>
          <span class="font-mono text-[10px] tabular-nums text-muted/70">
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
            <SliderRange class="absolute h-full bg-accent/70" />
          </SliderTrack>
          <SliderThumb
            v-for="_ in 2"
            :key="_"
            class="block h-3.5 w-3.5 rounded-full border border-accent/60 bg-bg shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
        </SliderRoot>
      </div>

      <section v-for="g in groups" :key="g.label" class="mb-2 last:mb-0">
        <button
          type="button"
          class="group/header flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors hover:bg-surface"
          :aria-expanded="!collapsedGroups.has(g.label)"
          @click="toggleGroup(g.label)"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="flex-shrink-0 text-muted/60 transition-transform"
            :class="collapsedGroups.has(g.label) ? '-rotate-90' : ''"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span class="flex-1 font-mono text-[10px] font-medium uppercase tracking-wider text-muted/70">
            {{ g.label }}
          </span>
          <span class="font-mono text-[10px] tabular-nums text-muted/50">
            {{ groupOnCount(g) }}/{{ g.leafIds.length }}
          </span>
          <span
            class="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
            :class="groupAnyOn(g) ? 'text-accent hover:bg-accent/8' : 'text-muted hover:text-accent'"
            role="button"
            tabindex="-1"
            :aria-label="groupAllOn(g) ? `Turn ${g.label} off` : `Turn ${g.label} on`"
            @click="toggleGroupAll(g, $event)"
          >
            {{ groupAllOn(g) ? 'Off' : 'On' }}
          </span>
        </button>
        <ul v-if="!collapsedGroups.has(g.label)" class="mt-0.5 space-y-0.5">
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
                class="accent-accent"
                @change="store.toggleCategory(item.cat.id)"
              >
              <img :src="item.cat.icon" alt="" class="h-4 w-4 flex-shrink-0 object-contain">
              <span class="truncate text-muted">{{ item.cat.label }}</span>
            </label>
            <span
              v-if="itemZoomGated(item)"
              title="Zoom in to see these markers"
              class="flex-shrink-0 text-[10px] text-muted/50"
            >zoom in</span>
            <span v-else class="flex-shrink-0 font-mono text-[10px] tabular-nums text-muted/50">
              {{ itemCount(item) }}
            </span>
          </li>
        </ul>
      </section>
    </div>

    <button
      v-if="collapsed"
      type="button"
      class="flex flex-col items-center gap-1.5 rounded-r-lg bg-bg/95 px-2 py-3 ring-1 ring-accent/20 backdrop-blur transition-colors hover:bg-bg"
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
        class="text-accent"
        aria-hidden="true"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      <span class="font-mono text-[10px] font-bold tabular-nums text-accent">{{ enabledCount }}</span>
      <span class="font-mono text-[8px] font-semibold uppercase tracking-wide text-muted/60">/{{ totalCount }}</span>
    </button>
  </div>

  <!-- Mobile bottom sheet -->
  <BottomSheet v-model="mobileOpenLocal" title="Filters" max-height="70vh">
    <template #header-actions>
      <button
        type="button"
        class="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent"
        @click="toggleAll"
      >
        {{ allOn ? 'All off' : 'All on' }}
      </button>
      <span class="h-3 w-px bg-border" aria-hidden="true" />
      <button
        type="button"
        class="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent"
        @click="reset"
      >
        Reset
      </button>
    </template>
    <div class="md:hidden">
      <div v-if="hasContentEnabled" class="mb-3 border-b border-border pb-3">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="font-mono text-[10px] font-medium uppercase tracking-wider text-muted/70">Level Range</span>
          <span class="font-mono text-[10px] tabular-nums text-muted/70">
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
            <SliderRange class="absolute h-full bg-accent/70" />
          </SliderTrack>
          <SliderThumb
            v-for="_ in 2"
            :key="_"
            class="block h-3.5 w-3.5 rounded-full border border-accent/60 bg-bg shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
        </SliderRoot>
      </div>

      <section v-for="g in groups" :key="g.label" class="mb-2 last:mb-0">
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors hover:bg-surface"
          :aria-expanded="!collapsedGroups.has(g.label)"
          @click="toggleGroup(g.label)"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="flex-shrink-0 text-muted/60 transition-transform"
            :class="collapsedGroups.has(g.label) ? '-rotate-90' : ''"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span class="flex-1 font-mono text-[10px] font-medium uppercase tracking-wider text-muted/70">
            {{ g.label }}
          </span>
          <span class="font-mono text-[10px] tabular-nums text-muted/50">
            {{ groupOnCount(g) }}/{{ g.leafIds.length }}
          </span>
          <span
            class="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
            :class="groupAnyOn(g) ? 'text-accent hover:bg-accent/8' : 'text-muted hover:text-accent'"
            role="button"
            tabindex="-1"
            @click="toggleGroupAll(g, $event)"
          >
            {{ groupAllOn(g) ? 'Off' : 'On' }}
          </span>
        </button>
        <ul v-if="!collapsedGroups.has(g.label)" class="mt-0.5 space-y-0.5">
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
                class="accent-accent"
                @change="store.toggleCategory(item.cat.id)"
              >
              <img :src="item.cat.icon" alt="" class="h-4 w-4 flex-shrink-0 object-contain">
              <span class="truncate text-muted">{{ item.cat.label }}</span>
            </label>
            <span
              v-if="itemZoomGated(item)"
              title="Zoom in to see these markers"
              class="flex-shrink-0 text-[10px] text-muted/50"
            >zoom in</span>
            <span v-else class="flex-shrink-0 font-mono text-[10px] tabular-nums text-muted/50">
              {{ itemCount(item) }}
            </span>
          </li>
        </ul>
      </section>
    </div>
  </BottomSheet>
</template>
