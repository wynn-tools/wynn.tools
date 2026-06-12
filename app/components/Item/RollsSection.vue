<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { idIsGood } from '~/lib/items/tooltip'

const props = defineProps<{ item: SearchItem }>()

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

function qualityVar(q: number): string {
  if (q >= 95)
    return 'var(--color-accent)'
  if (q >= 71)
    return 'var(--color-good)'
  if (q >= 30)
    return 'var(--color-muted)'
  return 'var(--color-bad)'
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
      <h2 class="kicker">
        Identification
      </h2>
      <span v-if="reidCost > 0" class="reid">
        <span class="reid-label">Re-ID</span>
        <EmeraldIcon unit="eb" />
        <span class="reid-amt">{{ reidCost }}</span>
      </span>
    </header>

    <div class="sim-panel">
      <div class="sim-header">
        <span class="sim-label">Roll Simulator</span>
        <span class="sim-quality" :style="{ color: qualityVar(quality) }">
          {{ qualityLabel }}
          <span class="sim-pct">{{ displayQuality }}</span>
        </span>
      </div>
      <div class="slider-wrap">
        <input
          v-model.number="quality"
          type="range" min="0" max="100" step="1"
          class="slider"
          :style="{ '--fill-color': qualityVar(quality), '--fill-pct': `${quality}%` }"
          aria-label="Roll quality"
        >
        <div class="slider-ticks">
          <span class="tick" style="left: 71%">1★</span>
          <span class="tick" style="left: 95%">2★</span>
        </div>
      </div>
    </div>

    <ul class="id-list">
      <li v-for="row in rows" :key="row.key" class="id-row">
        <div class="id-top">
          <span class="id-value" :style="{ color: row.good ? 'var(--color-good)' : 'var(--color-bad)' }">
            {{ simFormatted(row) }}
            <span v-if="stars(quality) > 0" class="id-stars">{{ '★'.repeat(stars(quality)) }}</span>
          </span>
          <span class="id-name">{{ row.label }}</span>
          <span class="id-range">{{ row.min }}{{ row.unit }} → {{ row.max }}{{ row.unit }}</span>
        </div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: `${quality}%`, background: qualityVar(quality) }"
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
  border-radius: 8px;
  background: var(--color-surface);
  padding: 18px 20px 20px;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.kicker {
  margin: 0;
  line-height: 1;
}

.reid {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: color-mix(in oklch, var(--color-bg) 50%, transparent);
  font-size: 14px;
}
.reid-label {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.reid-amt {
  font: 600 13px/1 var(--font-mono);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.sim-panel {
  background: color-mix(in oklch, var(--color-bg) 50%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 6px;
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
  transition: color 0.12s ease-out;
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
  transition: background 0.12s ease-out;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--fill-color);
  border: 2px solid var(--color-bg);
  cursor: pointer;
  transition: background 0.12s ease-out;
}
.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--fill-color);
  border: 2px solid var(--color-bg);
  cursor: pointer;
}
.slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-accent) 35%, transparent);
}
.slider:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-accent) 35%, transparent);
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

.id-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  transition: color 0.12s ease-out;
  font-variant-numeric: tabular-nums;
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
  font-variant-numeric: tabular-nums;
}

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
    width 0.12s ease-out,
    background 0.12s ease-out;
}
.bar-marker {
  position: absolute;
  top: -3px;
  width: 1px;
  height: 10px;
  background: var(--color-faint);
  pointer-events: none;
}
.bar-marker--2 {
  background: var(--color-muted);
}

@media (max-width: 720px) {
  .rolls {
    padding: 14px 14px 16px;
  }
  .sim-panel {
    padding: 12px 12px;
  }
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

@media (prefers-reduced-motion: reduce) {
  .sim-quality,
  .slider,
  .id-value,
  .bar-fill {
    transition: none;
  }
}
</style>
