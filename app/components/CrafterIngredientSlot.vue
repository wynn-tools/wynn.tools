<script setup lang="ts">
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'

defineProps<{
  index: number
  ingredient: Ingredient | null
}>()

const emit = defineEmits<{
  open: []
  clear: []
}>()

const TIER_COLOR: Record<number, string> = {
  0: '#cccccc',
  1: '#f6f734',
  2: '#ff44ff',
  3: '#07f2f0',
}

function nameColor(tier: number | undefined): string {
  if (tier === undefined)
    return '#fff'
  return TIER_COLOR[tier] ?? '#fff'
}

function onClear(e: MouseEvent) {
  e.stopPropagation()
  emit('clear')
}
</script>

<template>
  <button
    type="button"
    class="slot"
    :class="{ 'slot--filled': !!ingredient }"
    :aria-label="ingredient ? `Ingredient ${index + 1}: ${ingredient.displayName}` : `Add ingredient to slot ${index + 1}`"
    @click="emit('open')"
  >
    <template v-if="ingredient">
      <div class="slot-body">
        <span class="slot-name" :style="{ color: nameColor(ingredient.tier) }">{{ ingredient.displayName }}</span>
        <span class="slot-meta">Tier {{ ingredient.tier }} · Lv. {{ ingredient.lvl }}</span>
      </div>
      <button
        type="button"
        class="slot-clear"
        aria-label="Clear ingredient"
        @click="onClear"
      >
        ✕
      </button>
    </template>
    <template v-else>
      <span class="slot-plus" aria-hidden="true">+</span>
      <span class="slot-empty-label">Add ingredient</span>
    </template>
  </button>
</template>

<style scoped>
.slot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px 12px;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-muted);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.12s ease-out,
    box-shadow 0.12s ease-out,
    background 0.12s ease-out;
  font-family: var(--font-mono);
}

.slot--filled {
  border-style: solid;
}

.slot:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.slot:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.slot-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.slot-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-meta {
  font-size: 11px;
  color: var(--color-muted);
}

.slot-plus {
  font-size: 18px;
  color: var(--color-faint);
  line-height: 1;
}

.slot-empty-label {
  font-size: 12px;
  color: var(--color-muted);
}

.slot-clear {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 3px;
  transition:
    color 0.1s,
    background 0.1s;
}

.slot-clear:hover {
  color: var(--color-text);
  background: var(--color-border);
}
</style>
