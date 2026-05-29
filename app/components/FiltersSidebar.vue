<script setup lang="ts">
defineProps<{
  panelId: string
}>()

const open = ref(false)
</script>

<template>
  <button
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
    <span>{{ open ? 'Hide filters' : 'Filters' }}</span>
    <span class="filters-toggle-chevron" :class="{ open }" aria-hidden="true">›</span>
  </button>

  <aside
    :id="panelId"
    class="sidebar"
    :class="{ 'sidebar--collapsed-mobile': !open }"
  >
    <slot />
  </aside>
</template>
