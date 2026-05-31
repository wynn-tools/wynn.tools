<script setup lang="ts">
import type { MarketHistoryPoint } from '~/composables/useMarket'
import { computed, ref, watch } from 'vue'
import { useMarket } from '~/composables/useMarket'
import { sparklinePoints } from '~/lib/market/sparkline'

const props = defineProps<{ name: string }>()
const market = useMarket()
const points = ref<MarketHistoryPoint[]>([])
const loading = ref(true)
let gen = 0

const W = 280
const H = 60

watch(() => props.name, async (name) => {
  const myGen = ++gen
  loading.value = true
  try {
    const result = name ? await market.history(name) : []
    if (myGen === gen)
      points.value = result
  }
  catch {
    if (myGen === gen)
      points.value = []
  }
  finally {
    if (myGen === gen)
      loading.value = false
  }
}, { immediate: true })

const series = computed(() =>
  points.value
    .map(p => p.average_mid_80_percent_price ?? p.average_price)
    .filter((v): v is number => v != null),
)

const path = computed(() => {
  const pts = sparklinePoints(series.value, W, H)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
})
</script>

<template>
  <section class="history">
    <header class="head">
      <div class="head-left">
        <span class="kicker">Trade Market</span>
        <h2 class="title">
          Price History
        </h2>
      </div>
      <MarketAttribution />
    </header>

    <p v-if="loading" class="state">
      Loading history…
    </p>
    <p v-else-if="series.length < 2" class="state">
      Not enough history yet.
    </p>
    <svg v-else :viewBox="`0 0 ${W} ${H}`" class="spark" preserveAspectRatio="none">
      <path :d="path" fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
  </section>
</template>

<style scoped>
.history {
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

.spark {
  width: 100%;
  height: 60px;
  color: var(--color-accent);
}

.state {
  color: var(--color-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .history {
    padding: 14px 14px 16px;
  }
  .title {
    font-size: 18px;
  }
}
</style>
