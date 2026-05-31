<script setup lang="ts">
import type { BuildCostEntry } from '~/lib/market/build-cost'
import type { RawMarketPrice } from '~/lib/market/types'
import { computed, ref, watch } from 'vue'
import { useMarket } from '~/composables/useMarket'
import { slotItemId } from '~/lib/codec/build-codec'
import { buildCost } from '~/lib/market/build-cost'
import { collectBuildItems } from '~/lib/market/collect-build-items'
import { formatEmeralds } from '~/lib/market/format-emeralds'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()
const market = useMarket()
const priceMap = ref<Map<string, RawMarketPrice | null>>(new Map())

// Gather gear (slots 0..8) + flattened powders from the store.
const collected = computed(() => {
  const rb = store.rawBuild
  const ctx = store.ctx
  if (!rb || !ctx)
    return []
  const gear: { label: string, name: string, crafted: boolean }[] = []
  for (let slot = 0; slot <= 8; slot++) {
    const entry = rb.equipment[slot]
    if (entry?.kind === 'crafted') {
      gear.push({ label: `Slot ${slot}`, name: `Crafted ${slot}`, crafted: true })
      continue
    }
    const id = slotItemId(entry)
    if (id == null || id >= 10000)
      continue
    const item = ctx.rawItemIndex.resolveId(id)
    const name = item?.name as string | undefined
    if (name)
      gear.push({ label: (item?.displayName as string) ?? name, name, crafted: false })
  }
  const powders = rb.powders.flat()
  return collectBuildItems({ gear, powders })
})

watch(collected, async (items) => {
  const tradeable = items.filter(i => i.tradeable)
  if (tradeable.length === 0) {
    priceMap.value = new Map()
    return
  }
  try {
    const results = await market.prices(tradeable.map(i => ({ name: i.name, tier: i.tier ?? undefined })))
    const map = new Map<string, RawMarketPrice | null>()
    tradeable.forEach((i, idx) => map.set(`${i.name}|${i.tier ?? ''}`, results[idx] ?? null))
    priceMap.value = map
  }
  catch {
    priceMap.value = new Map()
  }
}, { immediate: true })

const cost = computed(() => {
  const entries: BuildCostEntry[] = collected.value.map(i => ({
    label: i.label,
    name: i.name,
    tier: i.tier,
    count: i.count,
    tradeable: i.tradeable,
    price: i.tradeable ? priceMap.value.get(`${i.name}|${i.tier ?? ''}`) ?? null : null,
  }))
  return buildCost(entries)
})

function fmt(v: number) {
  return formatEmeralds(v)
}
</script>

<template>
  <section v-if="collected.length" class="cost">
    <header class="cost-head">
      <h3 class="cost-title">
        Market Cost
      </h3>
      <MarketAttribution />
    </header>
    <div class="totals">
      <div class="total">
        <span class="total-label">Identified</span>
        <span class="total-value">{{ fmt(cost.identifiedTotal) }}</span>
      </div>
      <div class="total">
        <span class="total-label">Unidentified</span>
        <span class="total-value">{{ fmt(cost.unidentifiedTotal) }}</span>
      </div>
    </div>
    <p class="coverage">
      {{ cost.pricedCount }} of {{ cost.tradeableCount }} priced
    </p>
  </section>
</template>

<style scoped>
.cost {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cost-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.cost-title {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin: 0;
}

.totals {
  display: flex;
  gap: 1.5rem;
}

.total {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.total-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 0.7rem;
  color: var(--color-muted);
}

.total-value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.coverage {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 0.7rem;
  color: var(--color-muted);
  margin: 0;
}
</style>
