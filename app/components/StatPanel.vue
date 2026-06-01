<script setup lang="ts">
import type { BuildResult } from '~/lib/build/compute-build'
import { computed, ref } from 'vue'
import { buildStatSummary } from '~/lib/math/stat-summary'
import { useBuildStore } from '~/stores/build'

const props = defineProps<{ result: BuildResult }>()

const store = useBuildStore()

type View = 'summary' | 'detailed'
const STORAGE_KEY = 'wynn.tools:stat-view'

function initialView(): View {
  if (typeof window === 'undefined')
    return 'summary'
  return window.localStorage.getItem(STORAGE_KEY) === 'detailed' ? 'detailed' : 'summary'
}

const view = ref<View>(initialView())

function setView(next: View) {
  view.value = next
  if (typeof window !== 'undefined')
    window.localStorage.setItem(STORAGE_KEY, next)
}

const groups = computed(() => buildStatSummary(props.result, view.value))

// Glyph + color per element index (0=neutral .. 5=air) — game-world semantic.
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
  <section class="stats">
    <header class="stat-panel-head">
      <span class="kicker">Stats</span>
      <div class="head-controls">
        <div class="preset" role="group" aria-label="Roll quality preset">
          <button
            v-for="p in (['min', 'avg', 'max'] as const)"
            :key="p"
            type="button"
            class="preset-btn"
            :class="{ 'preset-btn--active': store.rollPreset === p }"
            @click="store.setRollPreset(p)"
          >
            {{ p === 'min' ? 'Min' : p === 'avg' ? 'Avg' : 'Max' }}
          </button>
        </div>
        <RollOverridesBadge />
      </div>
    </header>

    <div class="seg" role="tablist" aria-label="Stat detail level">
      <button
        v-for="v in (['summary', 'detailed'] as View[])"
        :key="v"
        type="button"
        role="tab"
        :aria-selected="view === v"
        class="seg-btn"
        :class="{ 'seg-btn--active': view === v }"
        @click="setView(v)"
      >
        {{ v === 'summary' ? 'Summary' : 'Detailed' }}
      </button>
    </div>

    <div
      v-for="group in groups"
      :key="group.id"
      class="ledger"
    >
      <div
        v-for="(line, i) in group.lines"
        :key="i"
        class="row"
        :class="{ 'row--sub': line.sub }"
      >
        <span class="label">
          <span
            v-if="line.element !== undefined"
            class="el-glyph"
            :style="{ color: ELEM_COLORS[line.element] }"
          >{{ ELEM_GLYPHS[line.element] }}</span>
          {{ line.label }}
        </span>
        <span class="value mono">{{ line.value }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stat-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.head-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.preset {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}
.preset-btn {
  background: transparent;
  border: 0;
  padding: 3px 9px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s;
}
.preset-btn:hover {
  color: var(--color-text);
}
.preset-btn--active {
  color: var(--color-bg);
  background: var(--color-accent);
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

/* Summary / Detailed segmented control */
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.seg-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 5px 0;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.seg-btn:hover {
  color: var(--color-text);
}

.seg-btn--active {
  color: var(--color-copper);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}

.seg-btn:focus-visible {
  outline: 2px solid var(--color-copper);
  outline-offset: 2px;
}

.ledger {
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

/* First ledger sits flush under the toggle — no extra rule */
.ledger:first-of-type {
  padding-top: 0;
  border-top: none;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 3px 0;
}

.row--sub {
  padding: 1px 0 1px 10px;
}

.label {
  font-size: 12px;
  color: var(--color-muted);
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.row--sub .label {
  font-size: 11px;
  color: var(--color-faint);
}

.value {
  font-size: 13px;
  color: var(--color-text);
  text-align: right;
  letter-spacing: 0.01em;
  white-space: nowrap;
  flex-shrink: 0;
}

.row--sub .value {
  font-size: 12px;
  color: var(--color-muted);
}

.el-glyph {
  font-family: 'Geist Mono', 'Courier New', monospace;
  flex-shrink: 0;
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

@media (max-width: 720px) {
  .stats {
    padding: 12px 14px;
  }
}
</style>
