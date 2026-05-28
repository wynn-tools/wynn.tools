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
// Mobile-only: filters open inline behind a toggle. Desktop ignores this.
const mobileFiltersOpen = ref(false)

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
      <button
        type="button"
        class="filters-toggle"
        :aria-expanded="mobileFiltersOpen"
        aria-controls="search-filters-panel"
        @click="mobileFiltersOpen = !mobileFiltersOpen"
      >
        <span class="filters-toggle-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </span>
        <span>{{ mobileFiltersOpen ? 'Hide filters' : 'Filters' }}</span>
        <span class="filters-toggle-chevron" :class="{ open: mobileFiltersOpen }" aria-hidden="true">›</span>
      </button>
      <aside
        id="search-filters-panel"
        class="sidebar"
        :class="{ 'sidebar--collapsed-mobile': !mobileFiltersOpen }"
      >
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
.filters-toggle {
  display: none;
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

@media (max-width: 720px) {
  .page {
    padding: 12px 0 48px;
  }
  .toolbar {
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .tabs button {
    padding: 8px 16px;
    min-height: 36px;
  }
  .layout {
    gap: 14px;
  }
  /* Filters become a tap-to-expand panel so results dominate the viewport.
     The toggle is a thin row, not a button card, to stay out of the way
     when collapsed. */
  .filters-toggle {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 8px 14px;
    color: var(--color-muted);
    cursor: pointer;
    font: 500 11px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition:
      color 0.12s ease-out,
      border-color 0.12s ease-out;
  }
  .filters-toggle:hover,
  .filters-toggle[aria-expanded='true'] {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
  .filters-toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  .filters-toggle-icon {
    display: inline-flex;
    align-items: center;
    color: currentColor;
  }
  .filters-toggle-chevron {
    margin-left: auto;
    transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    transform: rotate(90deg);
    font-size: 14px;
    line-height: 1;
  }
  .filters-toggle-chevron.open {
    transform: rotate(-90deg);
    color: var(--color-accent);
  }
  .sidebar--collapsed-mobile {
    display: none;
  }
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }
  .results-head {
    margin-bottom: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filters-toggle-chevron {
    transition: none;
  }
}
</style>
