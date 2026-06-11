<script setup lang="ts">
import type { StockEmoji, StockReactionCounts } from '~/lib/types/stock'

const props = defineProps<{ slug: string, counts: StockReactionCounts }>()
const emit = defineEmits<{ updated: [StockReactionCounts] }>()
const api = useStockApi()
const items: { emoji: StockEmoji, label: string }[] = [
  { emoji: 'thumbs_up', label: '👍' },
  { emoji: 'fire', label: '🔥' },
  { emoji: 'art', label: '🎨' },
  { emoji: 'bug', label: '🐛' },
]
async function react(e: StockEmoji) {
  const next = await api.react(props.slug, e)
  emit('updated', next)
}
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="it in items"
      :key="it.emoji"
      class="rounded border border-border bg-surface px-2.5 py-1 text-sm hover:border-accent"
      @click="react(it.emoji)"
    >
      {{ it.label }} {{ props.counts[it.emoji] }}
    </button>
  </div>
</template>
