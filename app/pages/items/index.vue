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
      <FiltersSidebar v-if="showSidebar" panel-id="search-filters-panel">
        <ItemSearchFilters v-if="tab === 'items'" v-model="criteria" :major-id-options="majorIdOptions" :set-options="setOptions" />
        <IngredientSearchFilters v-else-if="tab === 'ingredients'" v-model="ingredientCriteria" />
        <TomeSearchFilters v-else-if="tab === 'tomes'" v-model="tomeCriteria" />
        <MaterialSearchFilters v-else-if="tab === 'materials'" v-model="materialCriteria" />
      </FiltersSidebar>

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
.layout--full {
  grid-template-columns: 1fr;
}
.sidebar {
  padding-right: 4px;
  scrollbar-width: thin;
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
@media (max-width: 720px) {
  .page {
    padding: 12px 0 48px;
  }
  .toolbar {
    padding-bottom: 14px;
    margin-bottom: 16px;
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
</style>
