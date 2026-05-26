<script setup lang="ts">
import type { MapFeature } from '~/types/map'
import { computed, ref, watch } from 'vue'
import { shouldRenderMarker } from '~/composables/useMarkerLayer'
import { getNearestPlace } from '~/composables/useNearestPlace'
import { getCategory, isServiceCategory } from '~/config/categories'
import { useMapStore } from '~/stores/map'

const props = defineProps<{
  features: MapFeature[]
  open: boolean
}>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()
const store = useMapStore()

const visible = computed(() => {
  const bounds = store.viewBounds
  return props.features.filter((f) => {
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
  })
})

const focused = ref(0)
watch(
  () => props.open,
  () => {
    focused.value = 0
  },
)

function select(f: MapFeature) {
  store.setCenter(f.location.x, f.location.z)
  store.setFocus(f.featureId)
  emit('update:open', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    focused.value = Math.min(focused.value + 1, visible.value.length - 1)
    e.preventDefault()
  }
  else if (e.key === 'ArrowUp') {
    focused.value = Math.max(focused.value - 1, 0)
    e.preventDefault()
  }
  else if (e.key === 'Enter' && visible.value[focused.value]) {
    select(visible.value[focused.value]!)
  }
  else if (e.key === 'Escape') {
    emit('update:open', false)
  }
}

function categoryLabel(f: MapFeature): string {
  const cat = getCategory(f.categoryId)
  return cat?.label ?? ''
}

function categoryIcon(f: MapFeature): string {
  const cat = getCategory(f.categoryId)
  return cat?.icon ?? ''
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-1 scale-[0.98]"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-1 scale-[0.98]"
  >
    <div
      v-if="open"
      role="region"
      aria-label="Markers in view"
      class="pointer-events-auto absolute right-4 top-4 z-[410] flex w-80 flex-col overflow-hidden rounded-lg bg-bg/95 shadow-xl ring-1 ring-copper/20 backdrop-blur"
      style="max-height: calc(100vh - 5rem)"
      @keydown="onKeydown"
    >
      <!-- Header -->
      <div class="flex shrink-0 items-center justify-between px-4 pb-3 pt-3">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-semibold text-text">
            {{ visible.length }}
          </span>
          <span class="text-xs text-muted">
            {{ visible.length === 1 ? 'marker' : 'markers' }} in view
          </span>
        </div>
        <MapCloseBtn aria-label="Close marker list" @click="emit('update:open', false)" />
      </div>

      <!-- List -->
      <ul
        v-if="visible.length"
        role="listbox"
        aria-label="Markers in view"
        class="min-h-0 overflow-y-auto py-1.5"
      >
        <li
          v-for="(f, i) in visible"
          :key="f.featureId"
          role="option"
          :aria-selected="i === focused"
          :title="f.label"
          class="group flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-75"
          :class="i === focused ? 'bg-copper/10' : 'hover:bg-card'"
          @click="select(f)"
          @mouseenter="focused = i"
        >
          <!-- Icon -->
          <span
            :title="categoryLabel(f)"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card ring-1 ring-border group-hover:ring-copper/20"
            :class="i === focused ? 'ring-copper/20' : ''"
          >
            <img
              :src="categoryIcon(f)"
              :alt="categoryLabel(f)"
              class="h-4 w-4 object-contain"
              style="image-rendering: pixelated"
            >
          </span>

          <!-- Name + optional nearest place -->
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-sm font-medium leading-tight transition-colors"
              :class="i === focused ? 'text-copper' : 'text-text group-hover:text-text'"
            >
              {{ f.label }}
            </p>
            <p
              v-if="isServiceCategory(f.categoryId) && getNearestPlace(f.featureId)"
              class="truncate text-[10px] leading-tight text-muted/60"
            >
              {{ getNearestPlace(f.featureId) }}
            </p>
          </div>

          <!-- Fly arrow -->
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="shrink-0 text-muted/20 transition-colors group-hover:text-muted"
            :class="i === focused ? 'text-copper/50' : ''"
          >
            <path d="M2.5 6h7M6.5 3l3 3-3 3" />
          </svg>
        </li>
      </ul>

      <!-- Empty -->
      <div v-else class="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
        <p class="text-sm font-medium text-muted">
          Nothing in view
        </p>
        <p class="text-xs text-muted/50">
          Pan or zoom out to find markers
        </p>
      </div>
    </div>
  </Transition>
</template>
