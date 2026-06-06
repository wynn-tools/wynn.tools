<script setup lang="ts">
import { ref } from 'vue'
import WorldPicker from '~/components/map/WorldPicker.vue'
import { useMapStore } from '~/stores/map'

const emit = defineEmits<{ openFilters: [], openEvents: [] }>()
const store = useMapStore()
const open = ref(false)

function openFilters() {
  open.value = false
  emit('openFilters')
}

function openEvents() {
  open.value = false
  emit('openEvents')
}
</script>

<template>
  <div class="pointer-events-auto md:hidden">
    <!-- FAB trigger -->
    <button
      type="button"
      class="fixed bottom-40 right-4 z-[500] flex h-11 w-11 items-center justify-center rounded-full bg-bg shadow-lg ring-1 ring-copper/30 transition-colors hover:bg-card"
      :aria-expanded="open"
      aria-label="Map controls"
      @click="open = true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        aria-hidden="true"
        class="text-copper"
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
      </svg>
    </button>

    <BottomSheet v-model="open" title="Map Controls">
      <div class="flex flex-col gap-1">
        <!-- Territories -->
        <button
          type="button"
          class="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors"
          :class="
            store.showTerritories
              ? 'bg-copper/10 text-copper'
              : 'text-muted hover:bg-card hover:text-text'
          "
          @click="store.toggleTerritories()"
        >
          <span>Territories</span>
          <span
            class="h-2 w-2 rounded-full transition-colors"
            :class="store.showTerritories ? 'bg-copper' : 'bg-border'"
          />
        </button>

        <!-- World picker row -->
        <div class="flex items-center justify-between rounded-lg px-3 py-2.5">
          <span class="text-sm font-medium text-muted">World</span>
          <WorldPicker />
        </div>

        <!-- Divider -->
        <div class="my-1 border-t border-border" />

        <!-- Filters -->
        <button
          type="button"
          class="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-text"
          @click="openFilters"
        >
          <span>Marker Filters</span>
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
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <!-- World Events -->
        <button
          type="button"
          class="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-text"
          @click="openEvents"
        >
          <span>World Events</span>
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
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </BottomSheet>
  </div>
</template>
