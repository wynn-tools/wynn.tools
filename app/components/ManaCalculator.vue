<script setup lang="ts">
import type { BuildResult } from '~/lib/build/compute-build'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { computeManaSustain, parseCycle } from '~/lib/math/mana-sustain'

const props = defineProps<{ result: BuildResult }>()

const route = useRoute()
const router = useRouter()

// CPS + cycle persist in the URL query so a shared build link reproduces the
// creator's chosen defaults. Empty values are stripped to keep links clean.
const DEFAULT_CPS = 8

function queryStr(key: string): string | null {
  const v = route.query[key]
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? null : null
}

const cps = computed<number>({
  get: () => {
    const raw = queryStr('cps')
    const n = raw == null ? Number.NaN : Number.parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_CPS
  },
  set: v => writeQuery('cps', Number.isFinite(v) && v > 0 && v !== DEFAULT_CPS ? String(v) : null),
})

const cycleStr = computed<string>({
  get: () => queryStr('cycle') ?? '',
  set: (v) => {
    const cleaned = parseCycle(v).join('')
    writeQuery('cycle', cleaned || null)
  },
})

function writeQuery(key: string, value: string | null) {
  const query = { ...route.query }
  if (value == null)
    delete query[key]
  else
    query[key] = value
  router.replace({ query })
}

function onCps(e: Event) {
  cps.value = Number.parseFloat((e.target as HTMLInputElement).value)
}
function onCycle(e: Event) {
  cycleStr.value = (e.target as HTMLInputElement).value
}

// Spells 1-4 (skip melee, baseSpell 0). Map index → name + effective cost.
const spells = computed(() =>
  props.result.spells
    .filter(s => s.spell.baseSpell >= 1 && s.spell.baseSpell <= 4 && s.cost != null)
    .map(s => ({ idx: s.spell.baseSpell, name: s.spell.name, cost: s.cost as number }))
    .sort((a, b) => a.idx - b.idx),
)

const spellCosts = computed<Record<number, number>>(() => {
  const out: Record<number, number> = {}
  for (const s of spells.value)
    out[s.idx] = s.cost
  return out
})

const cycle = computed(() => parseCycle(cycleStr.value))

const sustain = computed(() =>
  computeManaSustain({
    manaRegen: (props.result.stats.get('mr') as number) ?? 0,
    manaSteal: (props.result.stats.get('ms') as number) ?? 0,
    cps: cps.value,
    cycle: cycle.value,
    spellCosts: spellCosts.value,
  }),
)

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function signed(n: number) {
  return `${n >= 0 ? '+' : ''}${fmt(n)}`
}

const netTone = computed(() => (sustain.value.netPerSec >= 0 ? 'pos' : 'neg'))
</script>

<template>
  <section class="mana">
    <header class="mana-head">
      <span class="kicker">Mana Sustain</span>
      <span class="mana-unit mono">per second</span>
    </header>

    <div class="mana-inputs">
      <label class="field">
        <span class="field-label">Clicks / s</span>
        <input
          class="field-input"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.5"
          :value="cps"
          @input="onCps"
        >
      </label>
      <label class="field field--cycle">
        <span class="field-label">Spell cycle</span>
        <input
          class="field-input"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 1213"
          spellcheck="false"
          autocomplete="off"
          :value="cycleStr"
          @input="onCycle"
        >
      </label>
    </div>

    <ul v-if="spells.length" class="legend">
      <li v-for="s in spells" :key="s.idx" class="legend-item">
        <span class="legend-key mono">{{ s.idx }}</span>
        <span class="legend-name">{{ s.name }}</span>
        <span class="legend-cost mono">{{ fmt(s.cost) }}<span class="mana-dot">●</span></span>
      </li>
    </ul>

    <div class="readout">
      <div class="readout-row">
        <span class="readout-label">Gain</span>
        <span class="readout-val readout-val--pos mono">{{ signed(sustain.gainPerSec) }}</span>
      </div>
      <div class="readout-row">
        <span class="readout-label">Spell cost</span>
        <span class="readout-val readout-val--neg mono">{{ sustain.hasVariedCycle ? signed(-sustain.usagePerSec) : '—' }}</span>
      </div>
      <div class="readout-row readout-row--net">
        <span class="readout-label">Net</span>
        <span class="readout-val mono" :class="`readout-val--${netTone}`">
          {{ sustain.hasVariedCycle ? signed(sustain.netPerSec) : signed(sustain.gainPerSec) }}
        </span>
      </div>
    </div>

    <p v-if="!sustain.hasVariedCycle" class="mana-hint">
      Enter a cycle of at least two different spells to estimate spell drain.
    </p>
  </section>
</template>

<style scoped>
.mana {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.mana-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.mana-unit {
  font-size: 10px;
  color: var(--color-faint);
  letter-spacing: 0.04em;
}
.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

.mana-inputs {
  display: flex;
  gap: 10px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field--cycle {
  flex: 1;
}
.field-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.field-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  background: color-mix(in oklch, var(--color-bg) 40%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 6px 9px;
  width: 84px;
  outline: none;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.field--cycle .field-input {
  width: 100%;
}
.field-input:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}
.field-input::-webkit-outer-spin-button,
.field-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}
.field-input[type='number'] {
  appearance: textfield;
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legend-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}
.legend-key {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-copper);
  border: 1px solid var(--color-accent-dim);
  border-radius: 3px;
  align-self: center;
}
.legend-name {
  flex: 1;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.legend-cost {
  font-size: 11px;
  color: var(--color-faint);
}
.mana-dot {
  color: oklch(75% 0.13 215);
  margin-left: 1px;
}

.readout {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in oklch, var(--color-surface-hi) 60%, transparent);
}
.readout-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}
.readout-label {
  font-size: 12px;
  color: var(--color-muted);
}
.readout-val {
  font-size: 13px;
  color: var(--color-text);
}
.readout-val--pos {
  color: oklch(72% 0.16 145);
}
.readout-val--neg {
  color: oklch(68% 0.16 22);
}
.readout-row--net {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}
.readout-row--net .readout-label {
  color: var(--color-text);
  font-weight: 500;
}
.readout-row--net .readout-val {
  font-size: 15px;
  font-weight: 600;
}

.mana-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-faint);
}

@media (max-width: 720px) {
  .field-input {
    min-height: 38px;
  }
}
</style>
