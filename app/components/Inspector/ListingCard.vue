<script setup lang="ts">
import type { ActualIdentOverride } from '~/components/Item/Tooltip.vue'
import type { MarketListing } from '~/composables/useItemMarket'
import type { SearchItem } from '~/lib/items-search/types'
import { computed } from 'vue'
import ItemTooltip from '~/components/Item/Tooltip.vue'
import { formatEmeralds } from '~/lib/market/format-emeralds'
import { rollColorVar } from '~/lib/wynntils/roll-percent'

const props = defineProps<{
  listing: MarketListing
  searchItem: SearchItem | null
}>()

const SCALE = 0.7
const COL_WIDTH = 290

const actualIdents = computed<Map<string, ActualIdentOverride>>(() => {
  const map = new Map<string, ActualIdentOverride>()
  if (!props.listing.stat_rolls)
    return map
  for (const row of props.listing.stat_rolls) {
    const actual = row.statActualValue?.value
    if (actual == null)
      continue
    const range = row.possibleValues?.range
    let rollPct: number | null = null
    if (range && range.fixed !== true) {
      const lo = Math.min(range.low, range.high)
      const hi = Math.max(range.low, range.high)
      if (hi !== lo)
        rollPct = ((actual - lo) / (hi - lo)) * 100
    }
    map.set(row.apiName, { actual, rollPct })
  }
  return map
})

const overallColor = computed(() => {
  const r = props.listing.overall_roll
  return r == null ? 'inherit' : `var(${rollColorVar(r)})`
})

const priceText = computed(() => formatEmeralds(props.listing.listing_price))
</script>

<template>
  <div class="listing-card">
    <div v-if="searchItem" class="scale-wrap" :style="{ zoom: SCALE }">
      <ItemTooltip
        :item="searchItem"
        :actual-idents="actualIdents"
        :overall-roll-pct="listing.overall_roll"
        :compact="true"
        :exportable="false"
      />
    </div>
    <div v-else class="fallback" :style="{ width: `${COL_WIDTH}px` }">
      <div class="fallback-name">
        {{ listing.name }}
      </div>
      <div v-if="listing.overall_roll != null" class="fallback-roll" :style="{ color: overallColor }">
        [{{ listing.overall_roll.toFixed(1) }}%]
      </div>
    </div>

    <div class="meta" :style="{ width: `${COL_WIDTH}px` }">
      <span v-if="listing.shiny_stat" class="shiny" title="Shiny stat">
        ✦ {{ listing.shiny_stat }}
      </span>
      <span class="price">
        {{ priceText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.listing-card {
  display: block;
}

.scale-wrap {
  width: 414px;
}

.fallback {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--color-surface);
}

.fallback-name {
  font-size: 12px;
  color: var(--color-text);
}

.fallback-roll {
  font-family: var(--font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 0 2px;
}

.shiny {
  color: var(--color-accent);
  font-size: 10px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.price {
  color: var(--color-text);
  margin-left: auto;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
