<script setup lang="ts">
import type { MarketHistoryPoint } from '~/composables/useMarket'
import type { RawMarketPrice } from '~/lib/market/types'
import { computed, ref, watch } from 'vue'
import { useMarket } from '~/composables/useMarket'
import { formatEmeralds, formatEmeraldsCompact } from '~/lib/market/format-emeralds'
import { sparklinePoints } from '~/lib/market/sparkline'

const props = defineProps<{ name: string }>()
const market = useMarket()

const raw = ref<RawMarketPrice | null>(null)
const history = ref<MarketHistoryPoint[]>([])
const loading = ref(true)
const error = ref(false)
let gen = 0

watch(() => props.name, async (name) => {
  const myGen = ++gen
  loading.value = true
  error.value = false
  try {
    // The item page wants both: live price (today) and the archived daily series
    // (through yesterday). One panel, one fetch pass.
    const [price, hist] = name
      ? await Promise.all([market.price(name), market.history(name)])
      : [null, []]
    if (myGen === gen) {
      raw.value = price
      history.value = hist
    }
  }
  catch {
    if (myGen === gen) {
      raw.value = null
      history.value = []
      error.value = true
    }
  }
  finally {
    if (myGen === gen)
      loading.value = false
  }
}, { immediate: true })

// Fair-market signal (middle-80% trimmed mean), used for both the headline and
// the chart so the "now" number and the line's last point are the same value.
function idFair(p: RawMarketPrice): number | null {
  return p.average_mid_80_percent_price ?? p.average_p50_ema_price ?? null
}
function unidFair(p: RawMarketPrice): number | null {
  return p.unidentified_average_mid_80_percent_price ?? p.unidentified_average_p50_ema_price ?? null
}

const idNow = computed(() => (raw.value ? idFair(raw.value) : null))
const unidNow = computed(() => (raw.value ? unidFair(raw.value) : null))
const hasData = computed(() => idNow.value != null || unidNow.value != null)

function sameDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
}

interface Row { date: Date, value: number, count: number | null }

// Archived daily fair-market series, with today's live price spliced onto the end.
const rows = computed<Row[]>(() => {
  const out: Row[] = history.value
    .map(p => ({
      date: new Date(p.timestamp),
      value: p.average_mid_80_percent_price ?? p.p50_price ?? p.average_price,
      count: p.total_count ?? null,
    }))
    .filter((r): r is Row => r.value != null && !Number.isNaN(r.date.getTime()))

  if (raw.value && idNow.value != null) {
    const today: Row = { date: new Date(), value: idNow.value, count: raw.value.total_count ?? null }
    const lastDay = out[out.length - 1]
    if (lastDay && sameDay(lastDay.date, today.date))
      out[out.length - 1] = today // archive already covers today; prefer the live value
    else
      out.push(today)
  }
  return out
})

const hasChart = computed(() => rows.value.length >= 2)

// ── Chart geometry ───────────────────────────────────────────────
const VW = 600
const VH = 170
const PAD = { x: 10, top: 14, bottom: 14 }
const innerW = VW - PAD.x * 2
const innerH = VH - PAD.top - PAD.bottom

const stats = computed(() => {
  const vs = rows.value.map(r => r.value)
  return { min: Math.min(...vs), max: Math.max(...vs), first: vs[0] ?? 0, last: vs[vs.length - 1] ?? 0 }
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
  if (!first || !hasChart.value)
    return null
  return { pct: ((last - first) / first) * 100, up: last >= first }
})

function shortDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const rangeLabel = computed(() => {
  const r = rows.value
  return r.length >= 2 ? `${shortDate(r[0]!.date)} – ${shortDate(r[r.length - 1]!.date)}` : ''
})
const avgCount = computed(() => {
  const cs = rows.value.map(r => r.count).filter((c): c is number => c != null)
  return cs.length ? Math.round(cs.reduce((a, b) => a + b, 0) / cs.length) : null
})
const ariaLabel = computed(() =>
  hasChart.value
    ? `${props.name} fair-market price, ${rangeLabel.value}: ${formatEmeraldsCompact(stats.value.min)} to ${formatEmeraldsCompact(stats.value.max)}`
    : `${props.name} price history`,
)

// ── Hover ────────────────────────────────────────────────────────
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
const lastPoint = computed(() => geo.value[geo.value.length - 1] ?? null)

function fmt(v: number | null) {
  return v == null ? '—' : formatEmeraldsCompact(v)
}
</script>

<template>
  <section class="market">
    <header class="head">
      <div class="head-left">
        <span class="kicker">Trade Market</span>
        <h2 class="title">
          Market
        </h2>
      </div>
      <MarketAttribution />
    </header>

    <p v-if="loading" class="state">
      Loading market data…
    </p>
    <p v-else-if="error" class="state">
      Couldn't load market data.
    </p>
    <p v-else-if="!hasData" class="state">
      No market listings found.
    </p>

    <template v-else>
      <!-- Current price readout -->
      <div class="readout">
        <div class="col col--primary">
          <span class="col-label">Identified</span>
          <div class="price-line">
            <span class="value">{{ fmt(idNow) }}</span>
            <span
              v-if="delta"
              class="delta"
              :class="{ 'delta--up': delta.up, 'delta--down': !delta.up }"
            >
              <span class="delta-arrow" aria-hidden="true">{{ delta.up ? '▲' : '▼' }}</span>
              {{ Math.abs(delta.pct).toFixed(1) }}%
              <span class="delta-span">/ {{ rows.length }}d</span>
            </span>
          </div>
          <span class="sub">{{ raw?.total_count ?? 0 }} listed</span>
        </div>

        <div class="col">
          <span class="col-label">Unidentified</span>
          <span class="value value--sm">{{ fmt(unidNow) }}</span>
          <span class="sub">{{ raw?.unidentified_count ?? 0 }} listed</span>
        </div>

        <div class="col col--range">
          <span class="sub">Low {{ fmt(raw?.lowest_price ?? null) }}</span>
          <span class="sub">High {{ fmt(raw?.highest_price ?? null) }}</span>
        </div>
      </div>

      <!-- History chart -->
      <template v-if="hasChart">
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

            <rect x="0" y="0" :width="VW" :height="VH" fill="transparent" />
          </svg>

          <span class="axis axis--max">{{ formatEmeraldsCompact(stats.max, 1) }}</span>
          <span class="axis axis--min">{{ formatEmeraldsCompact(stats.min, 1) }}</span>

          <span
            v-if="lastPoint && !hover"
            class="dot dot--last"
            :style="{ left: `${lastPoint.leftPct}%`, top: `${lastPoint.topPct}%` }"
          />
          <span
            v-if="hover"
            class="dot dot--hover"
            :style="{ left: `${hover.leftPct}%`, top: `${hover.topPct}%` }"
          />

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

        <div class="foot">
          <span class="meta">{{ rangeLabel }}</span>
          <span class="meta">Fair market<template v-if="avgCount"> · ~{{ avgCount }}/day</template></span>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.market {
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
  margin-bottom: 16px;
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
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 28px;
  margin-bottom: 18px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.col--range {
  margin-left: auto;
  text-align: right;
}

.col-label {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.value {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.value--sm {
  font-size: 18px;
}

.sub {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
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

.meta {
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
  .market {
    padding: 14px 14px 14px;
  }
  .title {
    font-size: 18px;
  }
  .readout {
    gap: 20px;
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
