<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import { tierTheme } from '~/lib/items/tooltip'

const props = defineProps<{ item: SearchItem }>()

const FIXED_TIERS = new Set(['Normal', 'Crafted'])

const isFixed = computed(() => {
  if (FIXED_TIERS.has(props.item.tier))
    return true
  const ids = props.item.identifications
  const entries = Object.values(ids)
  return entries.length > 0 && entries.every(e => e.min === e.max && e.max === e.raw)
})

function baseCost(tier: string, lvl: number): number {
  switch (tier) {
    case 'Unique': return Math.round(0.5 * lvl + 3)
    case 'Rare': return Math.round(1.2 * lvl + 8)
    case 'Legendary': return Math.round(4.5 * lvl + 12)
    case 'Fabled': return Math.round(12 * lvl + 26)
    case 'Mythic': return Math.round(18 * lvl + 90)
    case 'Set': return Math.round(1.5 * lvl + 8)
    default: return -1
  }
}

interface CurrencyBreakdown {
  stx: number
  le: number
  eb: number
  e: number
}

function toCurrency(total: number): CurrencyBreakdown {
  const stx = Math.floor(total / 262144)
  total -= stx * 262144
  const le = Math.floor(total / 4096)
  total -= le * 4096
  const eb = Math.floor(total / 64)
  const e = total - eb * 64
  return { stx, le, eb, e }
}

function invSlots(total: number): number {
  const { stx, le, eb, e } = toCurrency(total)
  return stx + Math.ceil(le / 64) + Math.ceil(eb / 64) + Math.ceil(e / 64)
}

interface RerollEntry {
  label: string
  total: number
  currency: CurrencyBreakdown
}

const rerolls = computed<RerollEntry[]>(() => {
  const base = baseCost(props.item.tier, props.item.level)
  if (base <= 0)
    return []
  const out: RerollEntry[] = []
  let n = 0
  let cost = base
  while (invSlots(cost) <= 28 && cost > 0) {
    out.push({
      label: n === 0 ? 'Initial ID' : `Reroll [${n + 1}]`,
      total: cost,
      currency: toCurrency(cost),
    })
    n++
    cost = Math.round(base * 5 ** n)
  }
  return out
})

const theme = computed(() => tierTheme(props.item.tier))
</script>

<template>
  <section v-if="!isFixed && rerolls.length" class="costs">
    <header class="head">
      <span class="kicker">Emerald cost</span>
      <h2 class="title">
        Identification Costs
      </h2>
    </header>

    <div class="grid">
      <div v-for="entry in rerolls" :key="entry.label" class="entry">
        <span class="entry-label">{{ entry.label }}</span>
        <span class="entry-total" :style="{ color: theme.light }">{{ entry.total.toLocaleString() }} E</span>
        <div class="currency">
          <span v-if="entry.currency.stx" class="denom denom--stx">
            <span class="denom-dot" />
            {{ entry.currency.stx }} LE Stacks
          </span>
          <span v-if="entry.currency.le" class="denom denom--le">
            <span class="denom-dot" />
            {{ entry.currency.le }} LE
          </span>
          <span v-if="entry.currency.eb" class="denom denom--eb">
            <span class="denom-dot" />
            {{ entry.currency.eb }} EB
          </span>
          <span v-if="entry.currency.e" class="denom denom--e">
            <span class="denom-dot" />
            {{ entry.currency.e }} E
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.costs {
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
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.title {
  font: 700 20px/1.1 var(--font-display, var(--font-body));
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: oklch(14% 0.006 30 / 0.5);
}
.entry-label {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.entry-total {
  font: 700 16px/1 var(--font-mono);
  margin-top: 2px;
}

.currency {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
}
.denom {
  display: flex;
  align-items: center;
  gap: 6px;
  font: 500 12px/1 var(--font-mono);
  color: var(--color-text);
}
.denom-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.denom--stx .denom-dot {
  background: oklch(65% 0.2 170);
}
.denom--le .denom-dot {
  background: oklch(70% 0.18 145);
}
.denom--eb .denom-dot {
  background: oklch(55% 0.16 145);
}
.denom--e .denom-dot {
  background: oklch(65% 0.14 140);
}
.denom--stx {
  color: oklch(65% 0.2 170);
}
.denom--le {
  color: oklch(70% 0.18 145);
}
.denom--eb {
  color: oklch(58% 0.15 145);
}
.denom--e {
  color: oklch(72% 0.13 140);
}
</style>
