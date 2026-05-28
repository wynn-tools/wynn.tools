<script setup lang="ts">
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'
import type { SearchIngredient } from '~/lib/items-search/types'
import Fuse from 'fuse.js'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toSearchIngredient } from '~/lib/items-search/ingredient-to-search'
import { useCraftStore } from '~/stores/craft'

defineProps<{ slotIndex: number }>()
const emit = defineEmits<{
  select: [id: number | null]
  close: []
  hoverIngredient: [ing: Ingredient | null]
}>()

const store = useCraftStore()
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

const MAX_RESULTS = 100

// Filter by active recipe's skill and level cap.
const filtered = computed<SearchIngredient[]>(() => {
  const ctx = store.ctx
  const recipe = store.recipe
  if (!ctx || !recipe)
    return []
  const skill = recipe.skill
  const maxLvl = recipe.lvl[1]
  const out: SearchIngredient[] = []
  for (const ing of ctx.ingredients.values()) {
    if (!ing.skills.includes(skill))
      continue
    if (ing.lvl > maxLvl)
      continue
    out.push(toSearchIngredient(ing))
  }
  // Stable order: by level asc then name.
  out.sort((a, b) => (a.level - b.level) || a.displayName.localeCompare(b.displayName))
  return out
})

const fuse = computed(() => new Fuse(filtered.value, {
  keys: ['displayName'],
  threshold: 0.4,
  ignoreLocation: true,
}))

const results = computed<SearchIngredient[]>(() => {
  const q = query.value.trim()
  if (!q)
    return filtered.value
  return fuse.value.search(q, { limit: MAX_RESULTS }).map(r => r.item)
})

function selectId(id: number | null) {
  emit('select', id)
}

function onHoverEnter(id: number) {
  const ing = store.ctx?.ingredients.get(id) ?? null
  emit('hoverIngredient', ing)
}

function onHoverLeave() {
  emit('hoverIngredient', null)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}

function onBackdropClick() {
  emit('close')
}

onMounted(() => {
  searchInput.value?.focus()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="picker-overlay" @click.self="onBackdropClick">
    <div
      class="picker"
      role="dialog"
      aria-modal="true"
      :aria-label="`Choose ingredient for slot ${slotIndex + 1}`"
    >
      <div class="picker-header">
        <input
          ref="searchInput"
          v-model="query"
          class="picker-search"
          type="text"
          placeholder="Search ingredients…"
        >
        <button class="picker-close" aria-label="Close" @click="emit('close')">
          ✕
        </button>
      </div>
      <ul class="picker-list">
        <li class="picker-item picker-item--none" @click="selectId(null)">
          None
        </li>
        <li
          v-for="ing in results"
          :key="ing.id"
          class="picker-item"
          @click="selectId(ing.id)"
          @mouseenter="onHoverEnter(ing.id)"
          @mouseleave="onHoverLeave"
        >
          <IngredientResultCard :ingredient="ing" />
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 16px;
  background: oklch(0% 0 0 / 0.45);
}

.picker {
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  width: 360px;
  max-width: 100%;
  max-height: 70vh;
  overflow: hidden;
  box-shadow: 0 10px 30px oklch(0% 0 0 / 0.4);
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
}

.picker-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text);
  caret-color: var(--color-accent);
}

.picker-search::placeholder {
  color: var(--color-faint);
}

.picker-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  transition: color 0.1s;
}

.picker-close:hover {
  color: var(--color-text);
}

.picker-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picker-item {
  cursor: pointer;
  border-radius: 6px;
}

.picker-item--none {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 10px 12px;
  color: var(--color-faint);
  border: 1px dashed var(--color-border);
  font-style: italic;
  transition:
    color 0.1s,
    border-color 0.1s;
}

.picker-item--none:hover {
  color: var(--color-muted);
  border-color: var(--color-muted);
}
</style>
