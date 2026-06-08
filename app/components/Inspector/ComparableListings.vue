<script setup lang="ts">
import type { MarketListing } from '~/composables/useItemMarket'
import type { SearchItem } from '~/lib/items-search/types'
import ListingCard from '~/components/Inspector/ListingCard.vue'

defineProps<{
  items: MarketListing[]
  pending: boolean
  overallRoll: number | null
  mode: 'banded' | 'fallback' | 'all'
  searchItem: SearchItem | null
}>()
</script>

<template>
  <section class="cl">
    <header class="cl-head">
      <div class="cl-head-label">
        <h3 class="kicker">
          {{ mode === 'all' ? 'Listings' : 'Comparable Listings' }}
        </h3>
        <p v-if="mode === 'fallback'" class="cl-subline">
          no in-band matches — showing cheapest
        </p>
      </div>
    </header>
    <div v-if="pending" class="empty">
      Loading…
    </div>
    <div v-else-if="items.length === 0" class="empty">
      No listings.
    </div>
    <div v-else class="results-list">
      <ListingCard v-for="(it, i) in items" :key="i" :listing="it" :search-item="searchItem" />
    </div>
  </section>
</template>

<style scoped>
.cl {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cl-head-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cl-subline {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 0.7rem;
  color: var(--color-muted);
  margin: 0;
  font-weight: 400;
  letter-spacing: normal;
  text-transform: none;
}

.empty {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--color-muted);
  padding: 6px 0;
}

.results-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, 290px);
  gap: 12px;
}
</style>
