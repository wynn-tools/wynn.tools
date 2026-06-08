<script setup lang="ts">
import type { RoundState, WynndleMode } from '~/lib/wynndle/types'
import { Check, Clipboard } from '@lucide/vue'
import { buildShareGrid } from '~/lib/wynndle/share'

// Visual share grid uses Wynncraft-trio-tinted parchment cells per Q9.
// Clipboard payload stays as standard emoji squares for cross-platform
// portability (Discord, social) — buildShareGrid handles that text.
//
// Delight pass: rows stagger in top-to-bottom, each row landing as a unit
// since each row IS one guess. Per-row delay ~120ms. On a win, every cell in
// the final row gets a one-shot ingot-gold edge halo that fades over 700ms,
// because the whole guess landed — the visual payoff for the solving move.
// On a loss the final row is just another miss, so no halo.

const props = defineProps<{ round: RoundState, mode: WynndleMode, puzzleNumber: number }>()
const text = computed(() => buildShareGrid(props.round, props.mode, { puzzleNumber: props.puzzleNumber }))

const grid = computed(() =>
  props.round.guesses.map(g =>
    Object.values(g.feedback ?? {}).map(c => c.status),
  ),
)

const lastRow = computed(() => grid.value.length - 1)

function isFinalRow(row: number) {
  return props.round.won && row === lastRow.value
}

const copied = ref(false)
async function onCopy() {
  await navigator.clipboard.writeText(text.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <div class="share">
    <div class="grid" role="img" :aria-label="`Share grid: ${grid.length} of 10 guesses`">
      <div
        v-for="(row, i) in grid"
        :key="i"
        class="grid-row"
        :data-final-row="isFinalRow(i) ? 'true' : null"
        :style="{ '--row-i': i }"
      >
        <span
          v-for="(status, j) in row"
          :key="j"
          class="grid-cell"
          :data-status="status"
        />
      </div>
    </div>
    <div class="share-actions">
      <button type="button" class="copy-btn" :data-copied="copied" @click="onCopy">
        <Check v-if="copied" :size="14" :stroke-width="2.5" />
        <Clipboard v-else :size="14" :stroke-width="2.2" />
        <span>{{ copied ? 'COPIED' : 'COPY RESULT' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.share {
  display: grid;
  gap: 14px;
  justify-items: center;
}

.grid {
  display: grid;
  gap: 4px;
}

/* Stagger reveal at the row level: each row lands as a unit since each row
   IS one guess. The animation lives on the row element; cells inside ride
   it together. Per-row delay ~120ms; ~250ms in-out per row. */
.grid-row {
  display: flex;
  gap: 4px;
  justify-content: center;
  animation: row-in 250ms cubic-bezier(0.165, 0.84, 0.44, 1) backwards;
  animation-delay: calc(var(--row-i, 0) * 120ms);
}

/* Pixel-frame mini cells: 22px squares with the same hotbar-slot anatomy as
   real guess cells, just tiny. Color comes from the Wynncraft trio per
   status. */
.grid-cell {
  width: 22px;
  height: 22px;
  background: var(--paper-light);
  border: 1px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.grid-cell[data-status='correct'] {
  background: var(--element-valid);
  border-color: var(--element-valid-sub);
  box-shadow: inset 0 1px 0 var(--element-valid-hover);
}

.grid-cell[data-status='partial'] {
  background: var(--element-warning);
  border-color: var(--element-warning-sub);
  box-shadow: inset 0 1px 0 var(--element-warning-hover);
}

.grid-cell[data-status='wrong'],
.grid-cell[data-status='higher'],
.grid-cell[data-status='lower'] {
  background: var(--element-danger);
  border-color: var(--element-danger-sub);
  box-shadow: inset 0 1px 0 var(--element-danger-hover);
}

/* Final-row halo. After the row's stagger lands, every cell in the row
   gets a one-shot ingot-gold ring that fades. Win-only via the parent
   row's data-final-row attribute. */
.grid-row[data-final-row='true'] .grid-cell {
  animation: final-halo 700ms cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
  animation-delay: calc((var(--row-i, 0) * 120ms) + 250ms);
}

@keyframes row-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes final-halo {
  0% {
    box-shadow:
      inset 0 1px 0 var(--element-valid-hover),
      0 0 0 0 var(--ingot-gold);
  }
  35% {
    box-shadow:
      inset 0 1px 0 var(--element-valid-hover),
      0 0 0 4px var(--ingot-gold),
      0 0 16px 2px var(--ingot-gold-dim);
  }
  100% {
    box-shadow:
      inset 0 1px 0 var(--element-valid-hover),
      0 0 0 0 transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grid-row,
  .grid-row[data-final-row='true'] .grid-cell {
    animation: none;
  }
}

/* Copy button: gold-edged parchment pill matching the Hub's PLAY CTA. */
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border: 2px solid rgb(82 60 18);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.1em;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
  transition:
    background-color 0.12s ease-out,
    color 0.18s ease-out;
}

.copy-btn:hover {
  background: var(--ingot-gold);
}

.copy-btn[data-copied='true'] {
  background: var(--element-valid);
  color: rgb(255 255 255);
  border-color: var(--element-valid-sub);
  box-shadow:
    inset 0 1px 0 var(--element-valid-hover),
    inset 0 -2px 0 rgb(15 80 15);
}

.copy-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

@media (max-width: 720px) {
  .grid-cell {
    width: 18px;
    height: 18px;
  }
}
</style>
