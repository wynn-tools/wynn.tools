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

const pieceLookup = computed(() => {
  const map = new Map<string, ReturnType<typeof resolveSlug>>()
  if (!searchData.value)
    return map
  for (const i of searchData.value.items)
    map.set(i.name, i)
  return map
})

interface ResolvedSet { name: string, set: NonNullable<ReturnType<typeof getSet>> }
function getSet(name: string) {
  return searchData.value?.sets.get(name)
}
const pageTitle = computed(() =>
  item.value ? `${item.value.displayName} — wynn.tools` : 'Item — wynn.tools',
)
const pageDesc = computed(() =>
  item.value
    ? `${item.value.tier} ${item.value.subType} (level ${item.value.level}) — stats, identifications, and history on wynn.tools.`
    : 'Wynncraft item stats and history.',
)
useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: pageDesc,
  ogDescription: pageDesc,
  twitterCard: 'summary_large_image',
})

const itemSets = computed<ResolvedSet[]>(() => {
  if (!item.value)
    return []
  const out: ResolvedSet[] = []
  for (const name of item.value.sets) {
    const set = getSet(name)
    if (set)
      out.push({ name, set })
  }
  return out
})
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

      <div class="grid">
        <aside class="hero">
          <ItemTooltip :item="item" />
        </aside>

        <div class="panes">
          <ItemSetSection
            v-for="s in itemSets"
            :key="s.name"
            :set-name="s.name"
            :set="s.set"
            :current="item"
            :piece-lookup="pieceLookup"
          />
          <ItemRollsSection :item="item" />
          <ItemMarketSection :name="item.name" />
          <ItemPriceHistory :name="item.name" />
          <ItemIdCostsSection :item="item" />
          <ItemObtainSection :item="item" />
          <ItemHistoryTimeline :entries="history" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 0 80px;
}
.back {
  display: inline-block;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  text-decoration: none;
  padding: 6px 0;
  margin-bottom: 18px;
  transition: color 0.12s ease-out;
}
.back:hover {
  color: var(--color-accent);
}
.grid {
  display: grid;
  grid-template-columns: 482px minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}
.hero {
  position: sticky;
  top: 76px;
  align-self: start;
  min-width: 0;
}
.panes {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.state {
  padding: 80px 20px;
  text-align: center;
  color: var(--color-muted);
}
@media (max-width: 1024px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .hero {
    position: static;
    justify-self: center;
    width: 100%;
    max-width: 482px;
  }
}

@media (max-width: 720px) {
  .page {
    padding: 12px 0 56px;
  }
  .back {
    margin-bottom: 10px;
    padding: 8px 0;
  }
  .grid {
    gap: 16px;
  }
  .panes {
    gap: 12px;
  }
  .hero {
    justify-self: stretch;
  }
}
</style>
