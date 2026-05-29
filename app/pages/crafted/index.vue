<script setup lang="ts">
import type { SortOption } from '~/components/SearchSortBar.vue'
import type { ApiItemSummary, ItemListFilters } from '~/composables/useApi'
import { useApi } from '~/composables/useApi'

useSeoMeta({
  title: 'Public Crafted Items — wynn.tools',
  description: 'Browse crafted items shared by the community.',
})

const route = useRoute()
const router = useRouter()

const q = computed(() => (route.query.q as string) || '')
const sort = computed<SortOption>(() => {
  const s = route.query.sort as string
  return s === 'oldest' || s === 'name' ? s : 'newest'
})

function setFilter(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, cursor: undefined } })
}

function onQ(val: string) {
  setFilter({ q: val || undefined })
}
function onSort(val: SortOption) {
  setFilter({ sort: val === 'newest' ? undefined : val })
}

const api = useApi()
const items = ref<ApiItemSummary[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const filters = computed<ItemListFilters>(() => ({
  q: q.value || undefined,
  sort: sort.value,
}))

async function load(cursor?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await api.listPublicItems(filters.value, cursor, 20)
    items.value = cursor ? [...items.value, ...res.data] : res.data
    nextCursor.value = res.nextCursor
  }
  catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load items'
  }
  finally {
    loading.value = false
  }
}

watch(filters, () => {
  items.value = []
  nextCursor.value = null
  load()
}, { deep: true })

await useAsyncData('public-items', () => load())
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="false" @click="navigateTo('/builds')">
          Builds
        </button>
        <button role="tab" class="on" aria-selected="true" @click="navigateTo('/crafted')">
          Crafted Items
        </button>
      </div>
    </div>

    <div class="layout">
      <FiltersSidebar panel-id="crafted-filters-panel">
        <div class="filters">
          <SearchSortBar :q="q" :sort="sort" @update:q="onQ" @update:sort="onSort" />
        </div>
      </FiltersSidebar>

      <section class="results">
        <p v-if="loadError" class="state">
          {{ loadError }}
        </p>
        <p v-else-if="items.length === 0 && !loading" class="state">
          No crafted items match these filters.
        </p>
        <template v-else>
          <div class="card-grid">
            <ItemCard
              v-for="item in items"
              :id="item.id"
              :key="item.id"
              :name="item.name"
              :game-version="item.gameVersion"
              :owner-id="item.owner?.id"
              :owner-name="item.owner?.name"
              :show-owner="true"
              :craft-hash="item.craftHash"
            />
          </div>
          <div v-if="nextCursor" class="load-more">
            <button class="load-more-btn" type="button" :disabled="loading" @click="load(nextCursor ?? undefined)">
              {{ loading ? 'Loading…' : 'Load more' }}
            </button>
          </div>
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
  gap: 20px;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 720px) {
  .page {
    padding: 12px 0 48px;
  }

  .toolbar {
    padding-bottom: 14px;
    margin-bottom: 16px;
  }

  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }
}
</style>
