<script setup lang="ts">
defineProps<{ active?: boolean }>()
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
    :class="
      active
        ? 'border-copper/40 bg-copper/5 text-copper'
        : 'border-border text-muted hover:border-copper/30 hover:bg-copper/5 hover:text-copper'
    "
  >
    <slot />
  </button>
</template>
