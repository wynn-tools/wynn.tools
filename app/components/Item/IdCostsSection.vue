<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'

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

const UNITS = ['stx', 'le', 'eb', 'e'] as const
</script>

<template>
  <section v-if="!isFixed && rerolls.length" class="costs">
    <header class="head">
      <h2 class="kicker">
        Identification Costs
      </h2>
      <span class="count">{{ rerolls.length }} rolls</span>
    </header>

    <ol class="rolls">
      <li v-for="(entry, i) in rerolls" :key="entry.label" class="row">
        <span class="row-rank">{{ i === 0 ? '—' : `×${i + 1}` }}</span>
        <span class="row-label">{{ entry.label }}</span>
        <span class="row-total">
          {{ entry.total.toLocaleString() }}<span class="row-total-unit">e</span>
        </span>
        <span class="row-denoms">
          <template v-for="u in UNITS" :key="u">
            <span v-if="entry.currency[u]" class="denom">
              <EmeraldIcon :unit="u" />
              <span class="denom-amt">{{ entry.currency[u] }}</span>
            </span>
          </template>
        </span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.costs {
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.kicker {
  margin: 0;
  line-height: 1;
}
.count {
  margin-left: auto;
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.rolls {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.row {
  display: grid;
  grid-template-columns: 32px minmax(96px, auto) minmax(110px, auto) 1fr;
  align-items: center;
  gap: 14px;
  padding: 9px 0;
  border-top: 1px solid color-mix(in oklch, var(--color-border) 55%, transparent);
}
.row:first-child {
  border-top: 0;
}

.row-rank {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--color-faint);
  text-align: left;
}
.row-label {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.row-total {
  font: 600 15px/1 var(--font-mono);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.row-total-unit {
  font-size: 11px;
  color: var(--color-faint);
  margin-left: 2px;
  letter-spacing: 0;
}

.row-denoms {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}
.denom {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: 500 12px/1 var(--font-mono);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  font-size: 16px;
}
.denom-amt {
  font-size: 12px;
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: 28px 1fr auto;
    gap: 10px;
    padding: 10px 0;
  }
  .row-denoms {
    grid-column: 1 / -1;
    justify-content: flex-start;
    margin-top: 2px;
    padding-left: 38px;
    gap: 10px;
  }
}
</style>
