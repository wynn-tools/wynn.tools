<script setup lang="ts">
import { itemHistory } from '~/lib/items-search/history'
import { buildSlugIndex, resolveSlug } from '~/lib/items-search/slug'

const route = useRoute()
const slug = computed(() => String(route.params.name))
const nameHint = computed(() => (route.query.name ? String(route.query.name) : undefined))

const { data: searchData, pending } = useItemSearchData()
const { data: changelogs } = useItemHistorySource()

const slugIndex = computed(() => searchData.value ? buildSlugIndex(searchData.value.items) : new Map())
const item = computed(() => resolveSlug(slugIndex.value, slug.value, nameHint.value))
const history = computed(() => (item.value && changelogs.value) ? itemHistory(item.value.name, changelogs.value) : [])
</script>

<template>
  <div class="page">
    <div v-if="pending" class="state">
      Loading…
    </div>
    <div v-else-if="!item" class="state">
      Item not found. <NuxtLink to="/items">
        Back to search
      </NuxtLink>
    </div>
    <div v-else class="detail">
      <NuxtLink to="/items" class="back">
        ← Search
      </NuxtLink>
      <div class="cols">
        <div class="col">
          <ItemTooltip :item="item" />
        </div>
        <div class="col">
          <ItemObtainSection :item="item" />
        </div>
        <div class="col">
          <ItemHistoryTimeline :entries="history" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 40px;
}
.back {
  font-size: 13px;
  color: var(--color-muted);
  text-decoration: none;
}
.back:hover {
  color: var(--color-accent);
}
.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  margin-top: 20px;
  align-items: start;
}
.state {
  padding: 60px;
  text-align: center;
  color: var(--color-muted);
}
</style>
