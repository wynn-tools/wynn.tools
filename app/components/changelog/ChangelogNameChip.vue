<script setup lang="ts">
defineProps<{ name: string, variant: 'added' | 'removed' }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
    :class="
      variant === 'added'
        ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
        : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
    "
  >
    {{ name }}
  </span>
</template>
