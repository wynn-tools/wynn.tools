<script setup lang="ts">
import type { StockEmoji, StockReactionCounts } from '~/lib/types/stock'

const props = defineProps<{ slug: string, counts: StockReactionCounts, disabled?: boolean }>()
const emit = defineEmits<{ updated: [StockReactionCounts] }>()
const api = useStockApi()

const ITEMS: { emoji: StockEmoji, glyph: string, label: string }[] = [
  { emoji: 'thumbs_up', glyph: '👍', label: 'Thumbs up' },
  { emoji: 'fire', glyph: '🔥', label: 'Fire' },
  { emoji: 'art', glyph: '🎨', label: 'Art' },
  { emoji: 'bug', glyph: '🐛', label: 'Bug' },
]
const pending = ref<StockEmoji | null>(null)

async function react(e: StockEmoji) {
  if (props.disabled || pending.value)
    return
  pending.value = e
  try {
    const next = await api.react(props.slug, e)
    emit('updated', next)
  }
  finally {
    pending.value = null
  }
}
</script>

<template>
  <div class="reactions">
    <button
      v-for="it in ITEMS"
      :key="it.emoji"
      type="button"
      class="reaction"
      :class="{ 'reaction--pending': pending === it.emoji }"
      :disabled="disabled || pending !== null"
      :aria-label="it.label"
      @click="react(it.emoji)"
    >
      <span class="reaction-glyph" aria-hidden="true">{{ it.glyph }}</span>
      <span class="reaction-count">{{ counts[it.emoji] }}</span>
    </button>
  </div>
</template>

<style scoped>
.reactions {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.reaction {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 5px 12px;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}
.reaction:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: var(--color-surface-hi);
}
.reaction:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.reaction:disabled {
  cursor: default;
  opacity: 0.6;
}
.reaction--pending {
  border-color: var(--color-accent);
}

.reaction-glyph {
  font-size: 13px;
  line-height: 1;
}

.reaction-count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.04em;
  color: var(--color-text);
}
</style>
