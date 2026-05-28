<script setup lang="ts">
import type { IngredientCriteria } from '~/lib/items-search/types'
import { defaultIngredientCriteria } from '~/lib/items-search/criteria-url'
import { filterIngredients } from '~/lib/items-search/filter-ingredients'
import { filterItems } from '~/lib/items-search/filter-items'

const RESULT_CAP = 200

const { data, pending, error, refresh } = useItemSearchData()
const { criteria } = useItemSearchQuery()
const ingredientCriteria = ref<IngredientCriteria>(defaultIngredientCriteria())
const tab = ref<'items' | 'ingredients'>('items')

const itemResults = computed(() => data.value ? filterItems(data.value.items, criteria.value) : [])
const ingredientResults = computed(() => data.value ? filterIngredients(data.value.ingredients, ingredientCriteria.value) : [])
const idKeys = computed(() => criteria.value.idSorts.map(s => s.key))
</script>

<template>
  <div class="page">
    <div class="tabs">
      <button :class="{ on: tab === 'items' }" @click="tab = 'items'">
        Items
      </button>
      <button :class="{ on: tab === 'ingredients' }" @click="tab = 'ingredients'">
        Ingredients
      </button>
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
        <ItemSearchFilters v-if="tab === 'items'" v-model="criteria" />
        <IngredientSearchFilters v-else v-model="ingredientCriteria" />
      </aside>

      <section class="results">
        <template v-if="tab === 'items'">
          <p class="count">
            {{ itemResults.length }} results
          </p>
          <div v-if="itemResults.length" class="grid">
            <ItemResultCard v-for="it in itemResults.slice(0, RESULT_CAP)" :key="it.id" :item="it" :id-keys="idKeys" />
          </div>
          <p v-else class="state">
            No items match these filters.
          </p>
          <p v-if="itemResults.length > RESULT_CAP" class="count">
            Showing {{ RESULT_CAP }} of {{ itemResults.length }}.
          </p>
        </template>
        <template v-else>
          <p class="count">
            {{ ingredientResults.length }} results
          </p>
          <div v-if="ingredientResults.length" class="grid">
            <IngredientResultCard v-for="ing in ingredientResults.slice(0, RESULT_CAP)" :key="ing.id" :ingredient="ing" />
          </div>
          <p v-else class="state">
            No ingredients match these filters.
          </p>
          <p v-if="ingredientResults.length > RESULT_CAP" class="count">
            Showing {{ RESULT_CAP }} of {{ ingredientResults.length }}.
          </p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 40px;
}
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
}
.tabs button {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-muted);
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
}
.tabs button.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
}
.sidebar {
  position: sticky;
  top: 76px;
  align-self: start;
}
.count {
  font-size: 12px;
  color: var(--color-muted);
  margin-bottom: 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.state {
  padding: 40px;
  color: var(--color-muted);
  text-align: center;
}
@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
  }
}
</style>
