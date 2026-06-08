<script setup lang="ts">
import type { RawMarketPrice } from '~/lib/market/types'
import { computed } from 'vue'
import MarketAttribution from '~/components/MarketAttribution.vue'
import { formatEmeralds } from '~/lib/market/format-emeralds'

const props = defineProps<{ price: RawMarketPrice | null, pending: boolean }>()

const hasData = computed(() => props.price != null)

const lowest = computed(() => props.price?.lowest_price ?? null)
const mid80 = computed(() => props.price?.average_mid_80_percent_price ?? null)
const count = computed(() => props.price?.total_count ?? 0)

const timestamp = computed(() => {
  const t = props.price?.timestamp
  if (!t)
    return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime()))
    return null
  return d.toLocaleString()
})
</script>

<template>
  <section class="ms">
    <header class="ms-head">
      <h3 class="kicker">
        Market Price
      </h3>
      <MarketAttribution />
    </header>

    <div v-if="pending && !hasData" class="empty">
      Loading…
    </div>
    <div v-else-if="!hasData" class="empty">
      No market data.
    </div>
    <template v-else>
      <div class="rows">
        <div class="row">
          <span class="row-label">Lowest</span>
          <span class="row-value">{{ lowest != null ? formatEmeralds(lowest) : '—' }}</span>
        </div>
        <div class="row">
          <span class="row-label">Avg mid-80%</span>
          <span class="row-value">{{ mid80 != null ? formatEmeralds(mid80) : '—' }}</span>
        </div>
        <div class="row">
          <span class="row-label">Listings</span>
          <span class="row-value">{{ count }}</span>
        </div>
      </div>
      <p v-if="timestamp" class="ts">
        Updated {{ timestamp }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.ms {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ms-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}

.row-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 0.7rem;
  color: var(--color-muted);
}

.row-value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.ts {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 0.7rem;
  color: var(--color-muted);
  margin: 0;
}

.empty {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--color-muted);
  padding: 6px 0;
}
</style>
