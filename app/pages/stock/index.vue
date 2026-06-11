<script setup lang="ts">
import type { ListFilters } from '~/composables/useStockApi'
import type { StockListItem } from '~/lib/types/stock'
import StockCard from '~/components/stock/StockCard.vue'
import StockFilters from '~/components/stock/StockFilters.vue'

const filters = ref<ListFilters>({ sort: 'latest-activity' })
const items = ref<StockListItem[]>([])
const cursor = ref<string | null>(null)
const loading = ref(false)
const api = useStockApi()

async function load(reset = false) {
  loading.value = true
  try {
    const res = await api.list({
      ...filters.value,
      cursor: reset ? undefined : (cursor.value ?? undefined),
    })
    items.value = reset ? res.items : [...items.value, ...res.items]
    cursor.value = res.nextCursor
  }
  finally {
    loading.value = false
  }
}

watch(() => JSON.stringify(filters.value), () => load(true), { immediate: true })

useHead({ title: 'Wynntils Stock' })
</script>

<template>
  <div class="mx-auto flex max-w-6xl gap-6 p-4">
    <StockFilters v-model="filters" class="w-56 shrink-0" />
    <main class="flex-1">
      <header class="mb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold">
          Stock
        </h1>
        <NuxtLink to="/stock/new" class="rounded bg-accent px-3 py-1.5 text-sm text-bg">
          New creation
        </NuxtLink>
      </header>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StockCard v-for="item in items" :key="item.id" :item="item" />
      </div>
      <p v-if="items.length === 0 && !loading" class="mt-8 text-center text-muted">
        No creations match these filters.
      </p>
      <div class="mt-6 flex justify-center">
        <button
          v-if="cursor"
          :disabled="loading"
          class="rounded border border-border px-4 py-1.5 text-sm"
          @click="load(false)"
        >
          {{ loading ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </main>
  </div>
</template>
