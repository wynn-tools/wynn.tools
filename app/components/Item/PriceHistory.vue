<script setup lang="ts">
import type { MarketHistoryPoint } from '~/composables/useMarket'
import { computed, ref, watch } from 'vue'
import { useMarket } from '~/composables/useMarket'
import { formatEmeralds, formatEmeraldsCompact } from '~/lib/market/format-emeralds'
import { sparklinePoints } from '~/lib/market/sparkline'

const props = defineProps<{ name: string }>()
const market = useMarket()
const points = ref<MarketHistoryPoint[]>([])
const loading = ref(true)
let gen = 0

// viewBox geometry. preserveAspectRatio="none" stretches geometry to fill the
// box; strokes keep their width via vector-effect, and the dots/tooltip are HTML
// overlays positioned by percent so they never distort.
const VW = 600
const VH = 170
const PAD = { x: 10, top: 14, bottom: 14 }
const innerW = VW - PAD.x * 2
const innerH = VH - PAD.top - PAD.bottom

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

interface Row { date: Date, value: number, count: number | null }

// Identified fair-market price per day (mid-80% trimmed mean), with graceful
// fallbacks. This is the same signal the price card leads with.
const rows = computed<Row[]>(() =>
  points.value
    .map(p => ({
      date: new Date(p.timestamp),
      value: p.average_mid_80_percent_price ?? p.p50_price ?? p.average_price,
      count: p.total_count ?? null,
    }))
    .filter((r): r is Row => r.value != null && !Number.isNaN(r.date.getTime())),
)

const stats = computed(() => {
  const vs = rows.value.map(r => r.value)
  return {
    min: Math.min(...vs),
    max: Math.max(...vs),
    first: vs[0] ?? 0,
    last: vs[vs.length - 1] ?? 0,
  }
})

const geo = computed(() =>
  sparklinePoints(rows.value.map(r => r.value), innerW, innerH).map(([x, y], i) => {
    const ax = x + PAD.x
    const ay = y + PAD.top
    return { x: ax, y: ay, leftPct: (ax / VW) * 100, topPct: (ay / VH) * 100, row: rows.value[i]! }
  }),
)

const linePath = computed(() =>
  geo.value.map((g, i) => `${i ? 'L' : 'M'}${g.x.toFixed(1)},${g.y.toFixed(1)}`).join(' '),
)

const areaPath = computed(() => {
  if (geo.value.length < 2)
    return ''
  const base = PAD.top + innerH
  const first = geo.value[0]!
  const last = geo.value[geo.value.length - 1]!
  return `${linePath.value} L${last.x.toFixed(1)},${base} L${first.x.toFixed(1)},${base} Z`
})

const delta = computed(() => {
  const { first, last } = stats.value
  if (!first)
    return null
  const pct = ((last - first) / first) * 100
  return { pct, up: pct >= 0 }
})

const avgCount = computed(() => {
  const cs = rows.value.map(r => r.count).filter((c): c is number => c != null)
  return cs.length ? Math.round(cs.reduce((a, b) => a + b, 0) / cs.length) : null
})

function shortDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const rangeLabel = computed(() => {
  const r = rows.value
  return r.length >= 2 ? `${shortDate(r[0]!.date)} – ${shortDate(r[r.length - 1]!.date)}` : ''
})

const ariaLabel = computed(() =>
  rows.value.length < 2
    ? `${props.name} price history`
    : `${props.name} fair-market price, ${rangeLabel.value}: `
      + `${formatEmeraldsCompact(stats.value.min)} to ${formatEmeraldsCompact(stats.value.max)}`,
)

// Hover: snap to the nearest day by pointer x.
const svgEl = ref<SVGSVGElement | null>(null)
const hoverIndex = ref<number | null>(null)

function onMove(e: PointerEvent) {
  const el = svgEl.value
  if (!el || geo.value.length < 2)
    return
  const rect = el.getBoundingClientRect()
  const f = (e.clientX - rect.left) / rect.width
  hoverIndex.value = Math.max(0, Math.min(geo.value.length - 1, Math.round(f * (geo.value.length - 1))))
}
function onLeave() {
  hoverIndex.value = null
}

const hover = computed(() => (hoverIndex.value == null ? null : geo.value[hoverIndex.value] ?? null))
const tipBelow = computed(() => (hover.value?.topPct ?? 0) < 32)
const last = computed(() => geo.value[geo.value.length - 1] ?? null)
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
    <p v-else-if="rows.length < 2" class="state">
      Not enough history yet.
    </p>

    <template v-else>
      <!-- Readout -->
      <div class="readout">
        <span class="value">{{ formatEmeraldsCompact(stats.last) }}</span>
        <span v-if="delta" class="delta" :class="{ 'delta--up': delta.up, 'delta--down': !delta.up }">
          <span class="delta-arrow" aria-hidden="true">{{ delta.up ? '▲' : '▼' }}</span>
          {{ Math.abs(delta.pct).toFixed(1) }}%
          <span class="delta-span">/ {{ rows.length }}d</span>
        </span>
      </div>

      <!-- Chart -->
      <div class="chart" @pointerleave="onLeave">
        <svg
          ref="svgEl"
          class="spark"
          :viewBox="`0 0 ${VW} ${VH}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="ariaLabel"
          @pointermove="onMove"
          @pointerdown="onMove"
        >
          <defs>
            <linearGradient id="ph-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--color-accent)" stop-opacity="0.16" />
              <stop offset="1" stop-color="var(--color-accent)" stop-opacity="0" />
            </linearGradient>
          </defs>

          <!-- min / max reference rails -->
          <line class="rail" :x1="PAD.x" :y1="PAD.top" :x2="VW - PAD.x" :y2="PAD.top" />
          <line class="rail" :x1="PAD.x" :y1="PAD.top + innerH" :x2="VW - PAD.x" :y2="PAD.top + innerH" />

          <path :d="areaPath" fill="url(#ph-area)" />
          <path class="line" :d="linePath" />

          <line
            v-if="hover"
            class="crosshair"
            :x1="hover.x"
            :y1="PAD.top"
            :x2="hover.x"
            :y2="PAD.top + innerH"
          />

          <!-- transparent hit area so pointer events fire across the whole chart -->
          <rect x="0" y="0" :width="VW" :height="VH" fill="transparent" />
        </svg>

        <!-- scale labels -->
        <span class="axis axis--max">{{ formatEmeraldsCompact(stats.max, 1) }}</span>
        <span class="axis axis--min">{{ formatEmeraldsCompact(stats.min, 1) }}</span>

        <!-- anchor + hover dots -->
        <span
          v-if="last && !hover"
          class="dot dot--last"
          :style="{ left: `${last.leftPct}%`, top: `${last.topPct}%` }"
        />
        <span
          v-if="hover"
          class="dot dot--hover"
          :style="{ left: `${hover.leftPct}%`, top: `${hover.topPct}%` }"
        />

        <!-- tooltip -->
        <div
          v-if="hover"
          class="tip"
          :class="{ 'tip--below': tipBelow }"
          :style="{ left: `${Math.min(86, Math.max(14, hover.leftPct))}%`, top: `${hover.topPct}%` }"
        >
          <span class="tip-date">{{ shortDate(hover.row.date) }}</span>
          <span class="tip-price">{{ formatEmeralds(Math.round(hover.row.value)) }}</span>
          <span v-if="hover.row.count != null" class="tip-count">{{ hover.row.count }} listed</span>
        </div>
      </div>

      <!-- x range + what the line means -->
      <div class="foot">
        <span class="range">{{ rangeLabel }}</span>
        <span class="caption">
          Fair market<template v-if="avgCount"> · ~{{ avgCount }}/day</template>
        </span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.history {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 18px 20px 16px;
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

/* ── Readout ── */

.readout {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}

.value {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.delta {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.delta-arrow {
  font-size: 9px;
}

.delta-span {
  color: var(--color-faint);
}

/* ── Chart ── */

.chart {
  position: relative;
  margin-top: 2px;
  touch-action: none;
}

.spark {
  display: block;
  width: 100%;
  height: 150px;
}

.line {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 1.75;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.rail {
  stroke: var(--color-border);
  stroke-width: 1;
  stroke-dasharray: 2 4;
  opacity: 0.7;
  vector-effect: non-scaling-stroke;
}

.crosshair {
  stroke: var(--color-accent);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.5;
  vector-effect: non-scaling-stroke;
}

.axis {
  position: absolute;
  right: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  color: var(--color-faint);
  background: color-mix(in oklch, var(--color-surface) 86%, transparent);
  padding: 1px 3px;
  border-radius: 3px;
  pointer-events: none;
}

.axis--max {
  top: 6px;
}

.axis--min {
  bottom: 6px;
}

.dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-surface);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.dot--last {
  opacity: 0.85;
}

.dot--hover {
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--color-accent) 22%, transparent);
}

/* ── Tooltip ── */

.tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 12px));
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 9px;
  background: color-mix(in oklch, var(--color-surface-hi) 96%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 24px oklch(0% 0 0 / 0.3);
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}

.tip--below {
  transform: translate(-50%, 12px);
}

.tip-date {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.tip-price {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.tip-count {
  font-size: 11px;
  color: var(--color-muted);
}

/* ── Foot ── */

.foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.range,
.caption {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--color-faint);
}

.state {
  color: var(--color-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .history {
    padding: 14px 14px 14px;
  }
  .title {
    font-size: 18px;
  }
  .value {
    font-size: 22px;
  }
  .spark {
    height: 128px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot,
  .tip,
  .crosshair {
    transition: none;
  }
}
</style>
