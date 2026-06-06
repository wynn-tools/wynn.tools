<script setup lang="ts">
defineProps<{
  panelId: string
}>()

const open = ref(false)
</script>

<template>
  <div class="filters-shell">
    <div id="filters-name-portal" class="filters-name-portal" />
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
  </div>
</template>

<style scoped>
.filters-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  align-self: start;
}
.filters-name-portal:empty {
  display: none;
}
.filters-name-portal :deep(.f-input) {
  width: 100%;
}
</style>
