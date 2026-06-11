<script setup lang="ts">
import { useMediaQuery } from '~/composables/useMediaQuery'

defineProps<{
  panelId: string
}>()

const open = ref(false)
const isMobile = useMediaQuery('(max-width: 900px)')
</script>

<template>
  <div class="filters-shell">
    <!-- Always-visible name input (or any always-visible toolbar) -->
    <div v-if="$slots.name" class="filters-name">
      <slot name="name" />
    </div>

    <!-- Mobile trigger. -->
    <button
      v-if="isMobile"
      type="button"
      class="filters-toggle"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="open = !open"
    >
      <span class="filters-toggle-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </span>
      <span>Filters</span>
      <span class="filters-toggle-chevron" aria-hidden="true">›</span>
    </button>

    <!-- Desktop sidebar. -->
    <aside
      v-if="!isMobile"
      :id="panelId"
      class="sidebar"
    >
      <slot />
    </aside>

    <!-- Mobile bottom sheet. -->
    <BottomSheet v-if="isMobile" v-model="open" title="Filters">
      <div :id="panelId">
        <slot />
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.filters-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  height: 100%;
}
.filters-name {
  flex-shrink: 0;
}
.filters-name :deep(.f-input) {
  width: 100%;
}
</style>
