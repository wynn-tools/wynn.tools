<script setup lang="ts">
import type { StockMedia } from '~/lib/types/stock'

const props = defineProps<{ media: StockMedia[] }>()
const api = useStockApi()
</script>

<template>
  <div v-if="props.media.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
    <figure v-for="m in props.media" :key="m.id">
      <img :src="api.blobUrl(m.blobSha256)" :alt="m.caption ?? ''" class="rounded border border-border">
      <figcaption v-if="m.caption" class="mt-1 text-xs text-muted">
        {{ m.caption }}
      </figcaption>
    </figure>
  </div>
</template>
