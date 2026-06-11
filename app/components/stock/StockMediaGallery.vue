<script setup lang="ts">
import type { StockMedia } from '~/lib/types/stock'

const props = defineProps<{ media: StockMedia[] }>()
const api = useStockApi()
const active = ref(0)

const items = computed(() => [...props.media].sort((a, b) => a.order - b.order))
const current = computed(() => items.value[active.value] ?? null)

watch(items, (v) => {
  if (active.value >= v.length)
    active.value = 0
})
</script>

<template>
  <div v-if="items.length" class="gallery">
    <figure class="frame">
      <img
        :src="api.blobUrl(current!.blobSha256)"
        :alt="current!.caption ?? ''"
        class="frame-img"
      >
      <figcaption v-if="current!.caption" class="frame-cap">
        {{ current!.caption }}
      </figcaption>
    </figure>
    <div v-if="items.length > 1" class="thumbs" role="tablist" aria-label="Media gallery">
      <button
        v-for="(m, i) in items"
        :key="m.id"
        type="button"
        role="tab"
        :aria-selected="active === i"
        class="thumb"
        :class="{ 'thumb--on': active === i }"
        @click="active = i"
      >
        <img :src="api.blobUrl(m.blobSha256)" alt="" aria-hidden="true">
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.frame {
  margin: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.frame-img {
  display: block;
  width: 100%;
  max-height: 540px;
  object-fit: contain;
  background: var(--color-bg);
}

.frame-cap {
  padding: 8px 12px;
  font: 400 12px/1.4 var(--font-sans);
  color: var(--color-muted);
  border-top: 1px solid var(--color-border);
}

.thumbs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.thumb {
  width: 56px;
  height: 56px;
  padding: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition:
    border-color 0.12s ease-out,
    opacity 0.12s ease-out;
  opacity: 0.7;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb:hover {
  opacity: 1;
}
.thumb--on {
  border-color: var(--color-accent);
  opacity: 1;
}
.thumb:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
