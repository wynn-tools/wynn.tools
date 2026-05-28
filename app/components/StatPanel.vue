<script setup lang="ts">
import type { BuildResult } from '~/lib/build/compute-build'
import { computed } from 'vue'

const props = defineProps<{ result: BuildResult }>()

interface ElementInfo {
  name: string
  glyph: string
  color: string
}

const ELEMENTS: ElementInfo[] = [
  { name: 'Earth', glyph: '✤', color: 'oklch(72% 0.18 145)' },
  { name: 'Thunder', glyph: '✦', color: 'oklch(82% 0.15 95)' },
  { name: 'Water', glyph: '❉', color: 'oklch(75% 0.13 215)' },
  { name: 'Fire', glyph: '✹', color: 'oklch(68% 0.18 35)' },
  { name: 'Air', glyph: '❋', color: 'oklch(85% 0.04 250)' },
]

const def = computed(() => props.result.defense)
</script>

<template>
  <section class="stats">
    <div class="ledger">
      <div class="row row--headline">
        <span class="label">Total HP</span>
        <span class="value value--lg">{{ Math.round(def.totalHp).toLocaleString() }}</span>
      </div>
      <div class="row">
        <span class="label">Effective HP</span>
        <span class="value mono">{{ Math.round(def.ehp.withAgi).toLocaleString() }}</span>
      </div>
      <div class="row">
        <span class="label">EHP no agi</span>
        <span class="value mono">{{ Math.round(def.ehp.withoutAgi).toLocaleString() }}</span>
      </div>
      <div class="row">
        <span class="label">HP Regen</span>
        <span class="value mono">{{ Math.round(def.totalHpr).toLocaleString() }}<span class="value-unit">/s</span></span>
      </div>
    </div>

    <div class="ledger ledger--elements">
      <div
        v-for="(e, i) in ELEMENTS"
        :key="e.name"
        class="row row--el"
        :style="{ '--el-color': e.color }"
      >
        <span class="label">
          <span class="el-glyph">{{ e.glyph }}</span>{{ e.name }}
        </span>
        <span class="value mono">{{ def.elementalDefenses[i]?.toFixed(0) ?? 0 }}</span>
      </div>
    </div>

    <div class="ledger ledger--util">
      <div class="row row--inline">
        <span class="label">Def</span>
        <span class="value mono">{{ def.defPct.toFixed(1) }}%</span>
      </div>
      <div class="row row--inline">
        <span class="label">Agi</span>
        <span class="value mono">{{ def.agiPct.toFixed(1) }}%</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.stats-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.ledger {
  display: flex;
  flex-direction: column;
}

.ledger--elements {
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.ledger--util {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}

.row--inline {
  padding: 0;
}

.label {
  font-size: 12px;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
  text-align: right;
  letter-spacing: 0.01em;
}

.value-unit {
  font-size: 10px;
  color: var(--color-faint);
  margin-left: 2px;
  letter-spacing: 0.06em;
}

.value--lg {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.row--headline .label {
  font-size: 11px;
  color: var(--color-faint);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.el-glyph {
  font-family: 'Geist Mono', 'Courier New', monospace;
  color: var(--el-color);
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}
</style>
