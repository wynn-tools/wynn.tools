<script setup lang="ts">
import type { IngredientCriteria } from '~/lib/items-search/types'
import { defaultIngredientCriteria } from '~/lib/items-search/criteria-url'
import { filterIngredients } from '~/lib/items-search/filter-ingredients'
import { filterItems } from '~/lib/items-search/filter-items'

useSeoMeta({
  title: 'Item Search — wynn.tools',
  ogTitle: 'Item Search — wynn.tools',
  description: 'Search and filter Wynncraft items and ingredients by stats, tier, type, and more.',
  ogDescription: 'Search and filter Wynncraft items and ingredients by stats, tier, type, and more.',
  twitterCard: 'summary_large_image',
})

const RESULT_CAP = 200

const { data, pending, error, refresh } = useItemSearchData()
const { criteria } = useItemSearchQuery()
const ingredientCriteria = ref<IngredientCriteria>(defaultIngredientCriteria())
const tab = ref<'items' | 'ingredients'>('items')

const itemResults = computed(() => data.value ? filterItems(data.value.items, criteria.value) : [])
const ingredientResults = computed(() => data.value ? filterIngredients(data.value.ingredients, ingredientCriteria.value) : [])
const idKeys = computed(() => criteria.value.idSorts.map(s => s.key))
const majorIdOptions = computed(() =>
  data.value
    ? [...new Set(data.value.items.flatMap(i => i.majorIds.map(m => m.name)))].sort()
    : [],
)
const setOptions = computed(() =>
  data.value
    ? [...new Set(data.value.items.flatMap(i => i.sets))].sort()
    : [],
)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button :class="{ on: tab === 'items' }" role="tab" :aria-selected="tab === 'items'" @click="tab = 'items'">
          Items
        </button>
        <button :class="{ on: tab === 'ingredients' }" role="tab" :aria-selected="tab === 'ingredients'" @click="tab = 'ingredients'">
          Ingredients
        </button>
      </div>
    </div>

    <div v-if="pending" class="state">
      Loading…
    </div>
    <div v-else-if="error" class="state">
      Failed to load item data. <button @click="refresh()">
        Retry
      </button>
    </div>

    <div v-else class="layout">
      <aside class="sidebar">
        <ItemSearchFilters v-if="tab === 'items'" v-model="criteria" :major-id-options="majorIdOptions" :set-options="setOptions" />
        <IngredientSearchFilters v-else v-model="ingredientCriteria" />
      </aside>

      <section class="results">
        <template v-if="tab === 'items'">
          <header class="results-head">
            <span class="count">{{ itemResults.length.toLocaleString() }} items</span>
            <span v-if="itemResults.length > RESULT_CAP" class="count count--dim">showing first {{ RESULT_CAP }}</span>
          </header>
          <div v-if="itemResults.length" class="grid">
            <ItemResultCard v-for="it in itemResults.slice(0, RESULT_CAP)" :key="it.id" :item="it" :id-keys="idKeys" />
          </div>
          <p v-else class="state">
            No items match these filters.
          </p>
        </template>
        <template v-else>
          <header class="results-head">
            <span class="count">{{ ingredientResults.length.toLocaleString() }} ingredients</span>
            <span v-if="ingredientResults.length > RESULT_CAP" class="count count--dim">showing first {{ RESULT_CAP }}</span>
          </header>
          <div v-if="ingredientResults.length" class="grid">
            <IngredientResultCard v-for="ing in ingredientResults.slice(0, RESULT_CAP)" :key="ing.id" :ingredient="ing" />
          </div>
          <p v-else class="state">
            No ingredients match these filters.
          </p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 0 64px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}
.tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.tabs button {
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: var(--color-muted);
  padding: 6px 14px;
  cursor: pointer;
  font: 600 12px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.tabs button:hover {
  color: var(--color-text);
}
.tabs button.on {
  color: var(--color-accent);
  background: oklch(65% 0.15 48 / 0.08);
}
.tabs button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.layout {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}
.sidebar {
  position: sticky;
  top: 76px;
  align-self: start;
  padding-right: 4px;
  scrollbar-width: thin;
}
.results {
  min-width: 0;
}
.results-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  height: 22px;
}
.count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
}
.count--dim {
  color: var(--color-muted);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 10px;
}
.state {
  padding: 56px 20px;
  color: var(--color-muted);
  text-align: center;
  font-size: 14px;
}
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .sidebar {
    position: static;
  }
}
</style>
