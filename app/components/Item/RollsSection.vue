<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { ID_BAD_COLOR, ID_GOOD_COLOR, idIsGood } from '~/lib/items/tooltip'

const props = defineProps<{ item: SearchItem }>()

// Roll quality: 0 = worst (min), 100 = best (max)
const quality = ref(70)

interface RollRow {
  key: string
  label: string
  unit: string
  min: number
  max: number
  raw: number
  good: boolean
}

const rows = computed<RollRow[]>(() =>
  Object.entries(props.item.identifications)
    .filter(([, r]) => r.min !== r.max)
    .map(([key, r]) => {
      const { label, unit } = humanizeField(key)
      return { key, label, unit, min: r.min, max: r.max, raw: r.raw, good: idIsGood(r.raw, isInverted(key)) }
    }),
)

function simValue(row: RollRow): number {
  return Math.round(row.min + (row.max - row.min) * quality.value / 100)
}

function simFormatted(row: RollRow): string {
  const v = simValue(row)
  return `${v > 0 ? '+' : ''}${v}${row.unit}`
}

function rollColor(q: number): string {
  if (q >= 100)
    return '#55ffff'
  if (q >= 95)
    return '#55ffff'
  if (q >= 71)
    return '#83f7c6'
  if (q >= 30)
    return '#ffd54f'
  return '#f78383'
}

function stars(q: number): number {
  if (q >= 100)
    return 3
  if (q >= 95)
    return 2
  if (q >= 71)
    return 1
  return 0
}

const reidCost = computed(() => {
  const tier = props.item.tier.toLowerCase()
  const lvl = props.item.level
  switch (tier) {
    case 'mythic': return Math.floor(90 + lvl * 18)
    case 'fabled': return Math.floor(16 + lvl * 8)
    case 'legendary': return Math.floor(12 + lvl * 4.5)
    case 'rare': return Math.floor(8 + lvl * 1.2)
    case 'unique': return Math.floor(3 + lvl * 0.5)
    case 'set': return Math.floor(8 + lvl * 1.5)
    default: return 0
  }
})

const qualityLabel = computed(() => {
  const q = quality.value
  if (q >= 100)
    return '3★ Perfect'
  if (q >= 95)
    return '2★ Near-perfect'
  if (q >= 71)
    return '1★ Above base'
  if (q >= 30)
    return 'Below base'
  return 'Low roll'
})

const displayQuality = computed(() => `${quality.value}%`)
</script>

<template>
  <section v-if="rows.length" class="rolls">
    <header class="head">
      <span class="kicker">Identification</span>
      <h2 class="title">
        Roll Range
      </h2>
    </header>

    <div class="meta-row">
      <div class="cost-chip">
        <span class="cost-icon" aria-hidden="true">◈</span>
        <span class="cost-label">Re-ID cost</span>
        <span class="cost-value">{{ reidCost }}EB</span>
      </div>
    </div>

    <!-- Simulator slider -->
    <div class="sim-panel">
      <div class="sim-header">
        <span class="sim-label">Roll Simulator</span>
        <span class="sim-quality" :style="{ color: rollColor(quality) }">
          {{ qualityLabel }}
          <span class="sim-pct">{{ displayQuality }}</span>
        </span>
      </div>
      <div class="slider-wrap">
        <input
          v-model.number="quality"
          type="range" min="0" max="100" step="1"
          class="slider"
          :style="{ '--fill-color': rollColor(quality), '--fill-pct': `${quality}%` }"
          aria-label="Roll quality"
        >
        <div class="slider-ticks">
          <span class="tick" style="left: 71%">1★</span>
          <span class="tick" style="left: 95%">2★</span>
        </div>
      </div>
    </div>

    <!-- ID rows -->
    <ul class="id-list">
      <li v-for="row in rows" :key="row.key" class="id-row">
        <div class="id-top">
          <span class="id-value" :style="{ color: row.good ? ID_GOOD_COLOR : ID_BAD_COLOR }">
            {{ simFormatted(row) }}
            <span v-if="stars(quality) > 0" class="id-stars">{{ '★'.repeat(stars(quality)) }}</span>
          </span>
          <span class="id-name">{{ row.label }}</span>
          <span class="id-range">{{ row.min }}{{ row.unit }} → {{ row.max }}{{ row.unit }}</span>
        </div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: `${quality}%`, background: rollColor(quality) }"
          />
          <div class="bar-marker" style="left: 71%" />
          <div class="bar-marker bar-marker--2" style="left: 95%" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.rolls {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 18px 20px 20px;
}

.head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
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

.meta-row {
  margin-bottom: 14px;
}
.cost-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: oklch(14% 0.006 30 / 0.5);
  font-size: 13px;
}
.cost-icon {
  color: oklch(72% 0.14 75);
  font-size: 14px;
}
.cost-label {
  color: var(--color-muted);
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.cost-value {
  color: oklch(85% 0.14 75);
  font: 600 13px/1 var(--font-mono);
}

/* Simulator */
.sim-panel {
  background: oklch(14% 0.006 30 / 0.5);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.sim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.sim-label {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.sim-quality {
  font: 600 13px/1 var(--font-mono);
  transition: color 0.15s ease;
}
.sim-pct {
  color: var(--color-muted);
  font-weight: 400;
  margin-left: 6px;
}

.slider-wrap {
  position: relative;
  padding-bottom: 20px;
}
.slider {
  width: 100%;
  height: 6px;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(
    to right,
    var(--fill-color) 0%,
    var(--fill-color) var(--fill-pct),
    var(--color-border) var(--fill-pct)
  );
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: background 0.1s ease;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--fill-color);
  box-shadow: 0 0 6px var(--fill-color);
  cursor: pointer;
  transition:
    background 0.1s ease,
    box-shadow 0.1s ease;
}
.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  background: var(--fill-color);
  box-shadow: 0 0 6px var(--fill-color);
  cursor: pointer;
}
.slider-ticks {
  position: relative;
  height: 16px;
  margin-top: 4px;
}
.tick {
  position: absolute;
  transform: translateX(-50%);
  font: 500 10px/1 var(--font-mono);
  color: var(--color-faint);
  white-space: nowrap;
  pointer-events: none;
}

/* ID rows */
.id-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.id-row {
}
.id-top {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
}
.id-value {
  font: 600 13px/1 var(--font-mono);
  text-align: left;
  transition: color 0.1s ease;
}
.id-stars {
  font-size: 10px;
  margin-left: 3px;
  opacity: 0.9;
}
.id-name {
  color: var(--color-text);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.id-range {
  font: 400 11px/1 var(--font-mono);
  color: var(--color-faint);
  white-space: nowrap;
  text-align: right;
}

/* Range bar */
.bar-track {
  position: relative;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: visible;
}
.bar-fill {
  height: 100%;
  border-radius: 2px;
  transition:
    width 0.12s ease,
    background 0.12s ease;
}
.bar-marker {
  position: absolute;
  top: -3px;
  width: 1px;
  height: 10px;
  background: oklch(50% 0.008 30);
  pointer-events: none;
}
.bar-marker--2 {
  background: oklch(60% 0.008 30);
}

@media (max-width: 720px) {
  .rolls {
    padding: 14px 14px 16px;
  }
  .title {
    font-size: 18px;
  }
  .sim-panel {
    padding: 12px 12px;
  }
  /* id-top grid (90px 1fr auto) crowds the value column on phones; let
     value drop onto its own row beside the range. */
  .id-top {
    grid-template-columns: 1fr auto;
    gap: 6px 10px;
  }
  .id-name {
    grid-column: 1 / -1;
    order: -1;
  }
  .id-value {
    text-align: left;
  }
  .id-range {
    text-align: right;
  }
  .slider::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
  }
  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
  }
  .slider {
    height: 8px;
  }
}
</style>
