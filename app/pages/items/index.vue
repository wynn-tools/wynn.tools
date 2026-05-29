<script setup lang="ts">
import type { IngredientCriteria, MaterialCriteria, TomeCriteria } from '~/lib/items-search/types'
import { defaultIngredientCriteria, defaultMaterialCriteria, defaultTomeCriteria } from '~/lib/items-search/criteria-url'
import { filterIngredients } from '~/lib/items-search/filter-ingredients'
import { filterItems } from '~/lib/items-search/filter-items'
import { filterMaterials } from '~/lib/items-search/filter-materials'
import { filterTomes } from '~/lib/items-search/filter-tomes'

useSeoMeta({
  title: 'Item Search — wynn.tools',
  ogTitle: 'Item Search — wynn.tools',
  description: 'Search and filter Wynncraft items, ingredients, tomes, charms, and materials by stats, tier, type, and more.',
  ogDescription: 'Search and filter Wynncraft items, ingredients, tomes, charms, and materials by stats, tier, type, and more.',
  twitterCard: 'summary_large_image',
})

const RESULT_CAP = 200

const { data, pending, error, refresh } = useItemSearchData()
const { criteria } = useItemSearchQuery()
const ingredientCriteria = ref<IngredientCriteria>(defaultIngredientCriteria())
const tomeCriteria = ref<TomeCriteria>(defaultTomeCriteria())
const materialCriteria = ref<MaterialCriteria>(defaultMaterialCriteria())

type Tab = 'items' | 'ingredients' | 'tomes' | 'charms' | 'materials'
const tab = ref<Tab>('items')
const mobileFiltersOpen = ref(false)

const showSidebar = computed(() => tab.value !== 'charms')

const itemResults = computed(() => data.value ? filterItems(data.value.items, criteria.value) : [])
const ingredientResults = computed(() => data.value ? filterIngredients(data.value.ingredients, ingredientCriteria.value) : [])
const tomeResults = computed(() => data.value ? filterTomes(data.value.tomes, tomeCriteria.value) : [])
const materialResults = computed(() => data.value ? filterMaterials(data.value.materials, materialCriteria.value) : [])
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
        <button :class="{ on: tab === 'tomes' }" role="tab" :aria-selected="tab === 'tomes'" @click="tab = 'tomes'">
          Tomes
        </button>
        <button :class="{ on: tab === 'charms' }" role="tab" :aria-selected="tab === 'charms'" @click="tab = 'charms'">
          Charms
        </button>
        <button :class="{ on: tab === 'materials' }" role="tab" :aria-selected="tab === 'materials'" @click="tab = 'materials'">
          Materials
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

    <div v-else class="layout" :class="{ 'layout--full': !showSidebar }">
      <button
        v-if="showSidebar"
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
        v-if="showSidebar"
        id="search-filters-panel"
        class="sidebar"
        :class="{ 'sidebar--collapsed-mobile': !mobileFiltersOpen }"
      >
        <ItemSearchFilters v-if="tab === 'items'" v-model="criteria" :major-id-options="majorIdOptions" :set-options="setOptions" />
        <IngredientSearchFilters v-else-if="tab === 'ingredients'" v-model="ingredientCriteria" />
        <TomeSearchFilters v-else-if="tab === 'tomes'" v-model="tomeCriteria" />
        <MaterialSearchFilters v-else-if="tab === 'materials'" v-model="materialCriteria" />
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

        <template v-else-if="tab === 'ingredients'">
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

        <template v-else-if="tab === 'tomes'">
          <header class="results-head">
            <span class="count">{{ tomeResults.length.toLocaleString() }} tomes</span>
            <span v-if="tomeResults.length > RESULT_CAP" class="count count--dim">showing first {{ RESULT_CAP }}</span>
          </header>
          <div v-if="tomeResults.length" class="grid">
            <TomeResultCard v-for="tome in tomeResults.slice(0, RESULT_CAP)" :key="tome.id" :tome="tome" />
          </div>
          <p v-else class="state">
            No tomes match these filters.
          </p>
        </template>

        <template v-else-if="tab === 'charms'">
          <header class="results-head">
            <span class="count">{{ data?.charms.length ?? 0 }} charms</span>
          </header>
          <div v-if="data?.charms.length" class="grid grid--charms">
            <CharmResultCard v-for="charm in data.charms" :key="charm.id" :charm="charm" />
          </div>
          <p v-else class="state">
            No charms available.
          </p>
        </template>

        <template v-else-if="tab === 'materials'">
          <header class="results-head">
            <span class="count">{{ materialResults.length.toLocaleString() }} materials</span>
            <span v-if="materialResults.length > RESULT_CAP" class="count count--dim">showing first {{ RESULT_CAP }}</span>
          </header>
          <div v-if="materialResults.length" class="grid">
            <MaterialResultCard v-for="mat in materialResults.slice(0, RESULT_CAP)" :key="mat.id" :material="mat" />
          </div>
          <p v-else class="state">
            No materials match these filters.
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
  overflow-x: auto;
  scrollbar-width: none;
  max-width: 100%;
}
.tabs::-webkit-scrollbar {
  display: none;
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
  white-space: nowrap;
  flex-shrink: 0;
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
.layout--full {
  grid-template-columns: 1fr;
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
.grid--charms {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
    padding: 8px 12px;
    min-height: 36px;
  }
  .layout {
    gap: 14px;
  }
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
  .grid--charms {
    grid-template-columns: 1fr;
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
