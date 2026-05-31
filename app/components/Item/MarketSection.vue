<script setup lang="ts">
import type { RawMarketPrice } from '~/lib/market/types'
import { computed, ref, watch } from 'vue'
import { useMarket } from '~/composables/useMarket'
import { formatEmeralds } from '~/lib/market/format-emeralds'
import { summarizePrice } from '~/lib/market/summarize'

const props = defineProps<{ name: string }>()

const market = useMarket()
const raw = ref<RawMarketPrice | null>(null)
const loading = ref(true)

watch(() => props.name, async (name) => {
  loading.value = true
  raw.value = name ? await market.price(name) : null
  loading.value = false
}, { immediate: true })

const model = computed(() => summarizePrice(raw.value))

function fmt(v: number | null) {
  return v == null ? '—' : formatEmeralds(v)
}
</script>

<template>
  <section class="market">
    <header class="head">
      <div class="head-left">
        <span class="kicker">Trade Market</span>
        <h2 class="title">
          Market Price
        </h2>
      </div>
      <MarketAttribution />
    </header>

    <p v-if="loading" class="state">
      Loading prices…
    </p>
    <p v-else-if="!model.hasData" class="state">
      No market listings found.
    </p>
    <div v-else class="grid">
      <div class="col">
        <span class="col-label">Identified</span>
        <span class="headline">{{ fmt(model.identified.headline) }}</span>
        <span class="count">{{ model.identified.count }} listed</span>
      </div>
      <div class="col">
        <span class="col-label">Unidentified</span>
        <span class="headline">{{ fmt(model.unidentified.headline) }}</span>
        <span class="count">{{ model.unidentified.count }} listed</span>
      </div>
      <div class="range">
        <span>Low {{ fmt(model.lowestPrice) }}</span>
        <span>High {{ fmt(model.highestPrice) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.market {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 18px 20px 20px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.kicker {
  font-size: 11px;
  line-height: 1;
  color: var(--color-muted);
}

.title {
  font: 700 20px/1.1 var(--font-display, var(--font-body));
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.col-label {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.headline {
  font: 700 18px/1.2 var(--font-mono);
  color: var(--color-text);
}

.count {
  font-size: 11px;
  color: var(--color-muted);
}

.range {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font: 400 11px/1.4 var(--font-mono);
  color: var(--color-muted);
}

.state {
  color: var(--color-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .market {
    padding: 14px 14px 16px;
  }
  .title {
    font-size: 18px;
  }
}
</style>
