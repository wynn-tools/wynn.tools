<script setup lang="ts">
import type { StockListItem } from '~/lib/types/stock'

defineProps<{ item: StockListItem }>()
</script>

<template>
  <NuxtLink
    :to="`/stock/${item.slug}`"
    class="block rounded-xl border border-border bg-surface p-4 transition hover:border-accent"
  >
    <div class="flex items-start justify-between gap-3">
      <h3 class="text-base font-semibold text-text">
        {{ item.title }}
      </h3>
      <span class="rounded bg-surface-hi px-2 py-0.5 text-xs uppercase text-muted">{{ item.kind }}</span>
    </div>
    <p class="mt-1 line-clamp-2 text-sm text-muted">
      {{ item.description }}
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-faint">
      <span
        v-for="cls in item.classes"
        :key="cls"
        class="rounded bg-surface-hi px-2 py-0.5"
      >{{ cls }}</span>
      <span class="ml-auto">↓ {{ item.installCount }}</span>
      <span>★ {{ item.reactionCounts.total }}</span>
    </div>
  </NuxtLink>
</template>
