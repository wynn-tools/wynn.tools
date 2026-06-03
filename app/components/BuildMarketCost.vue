<script setup lang="ts">
import type { BuildCostEntry } from '~/lib/market/build-cost'
import { computed } from 'vue'
import { useBuildMarket } from '~/composables/useBuildMarket'
import { buildCost } from '~/lib/market/build-cost'
import { formatEmeralds } from '~/lib/market/format-emeralds'

const { mode, setMode, collected, priceFor } = useBuildMarket()

const cost = computed(() => {
  const entries: BuildCostEntry[] = collected.value.map(i => ({
    label: i.label,
    name: i.name,
    tier: i.tier,
    count: i.count,
    tradeable: i.tradeable,
    price: i.tradeable ? priceFor(i.name, i.tier) : null,
  }))
  return buildCost(entries, mode.value)
})
</script>

<template>
  <section v-if="collected.length" class="cost">
    <header class="cost-head">
      <h3 class="cost-title">
        Market Cost
      </h3>
      <div class="cost-controls">
        <div class="preset" role="group" aria-label="Market price mode">
          <button
            v-for="m in (['min', 'avg', 'max'] as const)"
            :key="m"
            type="button"
            class="preset-btn"
            :class="{ 'preset-btn--active': mode === m }"
            @click="setMode(m)"
          >
            {{ m === 'min' ? 'Min' : m === 'avg' ? 'Avg' : 'Max' }}
          </button>
        </div>
        <MarketAttribution />
      </div>
    </header>
    <div class="totals">
      <div class="total">
        <span class="total-label">Identified</span>
        <span class="total-value">{{ formatEmeralds(cost.identifiedTotal) }}</span>
      </div>
      <div class="total">
        <span class="total-label">Unidentified</span>
        <span class="total-value">{{ formatEmeralds(cost.unidentifiedTotal) }}</span>
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
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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

.cost-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  overflow: hidden;
}

.preset-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: none;
  padding: 3px 7px;
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s;
}
.preset-btn:not(:last-child) {
  border-right: 1px solid var(--color-border);
}
.preset-btn:hover {
  color: var(--color-text);
}
.preset-btn--active {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
.preset-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
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
