<script setup lang="ts">
defineProps<{ name: string, variant: 'added' | 'removed', href?: string }>()
</script>

<template>
  <component
    :is="href ? resolveComponent('NuxtLink') : 'span'"
    :to="href"
    class="inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium transition"
    :class="[
      variant === 'added'
        ? 'bg-accent/[0.08] text-accent ring-1 ring-accent/25'
        : 'bg-rose-500/[0.06] text-rose-300/90 ring-1 ring-rose-500/20 line-through decoration-rose-400/40',
      href && 'hover:bg-accent/[0.14] hover:ring-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    ]"
  >
    {{ name }}
  </component>
</template>
