<script setup lang="ts">
import type { BuildResult, SpellOutput } from '~/lib/build/compute-build'
import type { DamagePartResult, SpellPartResult } from '~/lib/math/spell-calc'
import { computed, ref } from 'vue'
import { ATTACK_SPEED_LABELS, critChance } from '~/lib/math/dps'

const props = defineProps<{ result: BuildResult }>()

const open = ref<Record<number, boolean>>({ 0: true })

function toggle(key: number) {
  open.value = { ...open.value, [key]: !open.value[key] }
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const crit = computed(() => critChance(props.result.stats))
const spells = computed(() => props.result.spells)
const melee = computed(() => props.result.melee)

function isDamage(part: SpellPartResult): part is DamagePartResult {
  return part.type === 'damage'
}

function nonCritAvg(part: DamagePartResult): number {
  return (part.normalTotal[0] + part.normalTotal[1]) / 2 || 0
}
function critAvg(part: DamagePartResult): number {
  return (part.critTotal[0] + part.critTotal[1]) / 2 || 0
}
function avg(part: DamagePartResult): number {
  return (1 - crit.value) * nonCritAvg(part) + crit.value * critAvg(part) || 0
}

function displayPart(spellOut: SpellOutput): DamagePartResult | undefined {
  const damage = spellOut.parts.filter(isDamage)
  return (
    damage.find(p => p.name === spellOut.spell.display)
    ?? damage[damage.length - 1]
  )
}

const ELEM_COLORS = [
  'oklch(80% 0.02 250)',
  'oklch(72% 0.18 145)',
  'oklch(82% 0.15 95)',
  'oklch(75% 0.13 215)',
  'oklch(68% 0.18 35)',
  'oklch(85% 0.04 250)',
]
const ELEM_GLYPHS = ['○', '✤', '✦', '❉', '✹', '❋']
</script>

<template>
  <section class="output">
    <header class="output-head">
      <span class="kicker">Combat Output</span>
      <span class="headline mono">{{ fmt(melee.averageDps) }} <span class="headline-unit">DPS</span></span>
    </header>

    <ul class="acc">
      <li
        v-for="spellOut in spells"
        :key="spellOut.spell.baseSpell"
        class="acc-item"
        :class="{ 'acc-item--open': open[spellOut.spell.baseSpell] }"
      >
        <button class="acc-trigger" type="button" @click="toggle(spellOut.spell.baseSpell)">
          <span class="acc-chevron" :class="{ 'acc-chevron--open': open[spellOut.spell.baseSpell] }">▸</span>
          <span class="acc-title">
            {{ spellOut.spell.name }}
            <span v-if="spellOut.cost !== null" class="acc-cost">
              ({{ fmt(spellOut.cost) }}<span class="mana-dot">●</span>)
            </span>
          </span>
          <span class="acc-value mono">
            {{ spellOut.spell.baseSpell === 0 ? fmt(melee.averageDps) : fmt(avg(displayPart(spellOut)!)) }}
          </span>
        </button>

        <div v-if="open[spellOut.spell.baseSpell]" class="acc-body">
          <!-- Melee summary row -->
          <template v-if="spellOut.spell.baseSpell === 0">
            <div class="row">
              <span class="label">Attack Speed</span>
              <span class="value mono">{{ ATTACK_SPEED_LABELS[melee.attackSpeed] ?? melee.attackSpeed }}</span>
            </div>
            <div class="row">
              <span class="label">Per Attack</span>
              <span class="value mono">{{ fmt(melee.perAttack) }}</span>
            </div>
            <div class="row">
              <span class="label">Average DPS</span>
              <span class="value value--copper mono">{{ fmt(melee.averageDps) }}</span>
            </div>
          </template>

          <!-- Per-part breakdown -->
          <template v-for="part in spellOut.parts.filter(p => p.display !== false)" :key="part.name">
            <!-- Damage part -->
            <div v-if="isDamage(part)" class="part">
              <div class="part-name">
                {{ part.name }}
              </div>

              <div class="multipliers">
                <template v-for="(m, i) in part.multipliers" :key="i">
                  <span v-if="m > 0" class="mult-elem" :style="{ color: ELEM_COLORS[i] }">{{ Math.round(m * 10) / 10 }}%</span>
                </template>
                <span class="mult-total">({{ Math.round(part.multipliers.reduce((a, b) => a + b, 0) * 10) / 10 }}%)</span>
                <span class="mult-scaling">{{ part.isSpell ? 'Spell' : 'Melee' }}</span>
              </div>

              <div class="row">
                <span class="label">Average</span>
                <span class="value mono">{{ fmt(avg(part)) }}</span>
              </div>

              <div class="row">
                <span class="label">Non-Crit Average</span>
                <span class="value mono">{{ fmt(nonCritAvg(part)) }}</span>
              </div>
              <div
                v-for="(val, i) in part.normalMax"
                v-show="val !== 0"
                :key="`nc-${i}`"
                class="elem-range"
                :style="{ color: ELEM_COLORS[i] }"
              >
                <span class="elem-glyph">{{ ELEM_GLYPHS[i] }}</span>
                {{ fmt(part.normalMin[i]!) }} &ndash; {{ fmt(part.normalMax[i]!) }}
              </div>

              <div class="row">
                <span class="label">Crit Average</span>
                <span class="value mono">{{ fmt(critAvg(part)) }}</span>
              </div>
              <div
                v-for="(val, i) in part.critMax"
                v-show="val !== 0"
                :key="`c-${i}`"
                class="elem-range"
                :style="{ color: ELEM_COLORS[i] }"
              >
                <span class="elem-glyph">{{ ELEM_GLYPHS[i] }}</span>
                {{ fmt(part.critMin[i]!) }} &ndash; {{ fmt(part.critMax[i]!) }}
              </div>
            </div>

            <!-- Heal part (amount deferred) -->
            <div v-else class="part">
              <div class="part-name">
                {{ part.name }}
              </div>
              <div class="row">
                <span class="label muted-label">Heal calculation coming soon</span>
              </div>
            </div>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.output {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.output-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.headline {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 30px;
  font-weight: 600;
  color: var(--color-copper);
  letter-spacing: -0.01em;
  line-height: 1;
}

.headline-unit {
  font-size: 12px;
  color: var(--color-muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 500;
  margin-left: 4px;
}

.acc {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acc-item {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.12s;
}

.acc-item--open {
  border-color: oklch(52% 0.12 48);
}

.acc-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  font-family: inherit;
}

.acc-trigger:hover {
  background: oklch(19% 0.008 30 / 0.6);
}

.acc-chevron {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-muted);
  transition: transform 0.15s ease-out;
  width: 12px;
  flex-shrink: 0;
  text-align: center;
}

.acc-chevron--open {
  transform: rotate(90deg);
  color: var(--color-copper);
}

.acc-title {
  flex: 1;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text);
}

.acc-cost {
  font-weight: 400;
  color: var(--color-muted);
  margin-left: 4px;
}

.mana-dot {
  color: oklch(75% 0.13 215);
  margin-left: 1px;
}

.acc-value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-copper);
  flex-shrink: 0;
}

.acc-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px 12px 34px;
  border-top: 1px solid var(--color-border);
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}

.label {
  font-size: 12px;
  color: var(--color-muted);
}

.value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
}

.value--copper {
  color: var(--color-copper);
  font-weight: 600;
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

.part {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid oklch(28% 0.008 30 / 0.6);
}

.part-name {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 3px;
}

.multipliers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-bottom: 2px;
}

.mult-elem {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
}

.mult-total {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-muted);
}

.mult-scaling {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-faint);
  margin-left: 2px;
}

.elem-range {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  padding-left: 12px;
}

.elem-glyph {
  margin-right: 4px;
}

@media (max-width: 720px) {
  .output {
    padding: 14px 14px;
    gap: 12px;
  }
  .headline {
    font-size: 26px;
  }
  .acc-trigger {
    padding: 11px 12px;
    min-height: 44px;
  }
  .acc-body {
    padding: 6px 12px 12px 28px;
  }
}
</style>
