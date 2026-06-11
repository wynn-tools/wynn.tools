<script setup lang="ts">
/**
 * SearchPage — the viewport-locked shell shared by /items, /builds,
 * /crafted, /stock. Renders the toolbar / sidebar / results / optional
 * rail tracks; consumer fills each via slots.
 *
 * The styling lives in global.css (.page, .toolbar, .layout, .sidebar,
 * .results) so any element class-named the same way (e.g. the <aside>
 * FiltersSidebar renders) plugs in automatically.
 */

withDefaults(defineProps<{
  /** Left filters column width. */
  sidebarWidth?: string
  /** Right rail column width (only used when #rail slot is filled). */
  railWidth?: string
  /** Gap between layout columns. Override when a 3-column layout needs to be tighter. */
  gap?: string
}>(), {
  sidebarWidth: '248px',
  railWidth: '124px',
  gap: '40px',
})

const slots = useSlots()
const hasSidebar = computed(() => !!slots.sidebar)
const hasRail = computed(() => !!slots.rail)
</script>

<template>
  <div
    class="search-page"
    :style="{
      '--sidebar-w': sidebarWidth,
      '--rail-w': railWidth,
      '--layout-gap': gap,
    }"
  >
    <div class="toolbar">
      <slot name="toolbar" />
    </div>
    <div
      class="layout"
      :class="[
        hasSidebar ? 'layout--has-sidebar' : null,
        hasRail ? 'layout--has-rail' : null,
      ]"
    >
      <slot v-if="hasSidebar" name="sidebar" />
      <section class="results">
        <slot />
      </section>
      <slot v-if="hasRail" name="rail" />
    </div>
  </div>
</template>

<style scoped>
.layout {
  gap: var(--layout-gap);
  grid-template-columns: minmax(0, 1fr);
}
.layout--has-sidebar {
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
}
.layout--has-rail {
  grid-template-columns: minmax(0, 1fr) var(--rail-w);
}
.layout--has-sidebar.layout--has-rail {
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr) var(--rail-w);
}

@media (max-width: 900px) {
  .layout,
  .layout--has-sidebar,
  .layout--has-rail,
  .layout--has-sidebar.layout--has-rail {
    grid-template-columns: 1fr;
  }
}
</style>
