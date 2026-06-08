<script setup lang="ts">
import type { CellStatus } from '~/lib/wynndle/types'
import { ArrowDown, ArrowUp } from '@lucide/vue'

// One attribute cell inside a guess row. Carries a small label above the
// value (attribute name) and a Wynncraft-trio fill: green match, gold close,
// red miss. Numeric miss cells overlay a ↑/↓ arrow alongside the red fill so
// the player gets both signals at once (Q5: color + direction).

defineProps<{
  status: CellStatus
  label: string | number
  /** The attribute name shown above the value, e.g. "DPS", "LEVEL". */
  attribute?: string
}>()
</script>

<template>
  <div class="cell" :data-status="status">
    <span v-if="attribute" class="cell-attr">{{ attribute }}</span>
    <div class="cell-value">
      <ArrowUp v-if="status === 'higher'" :size="14" :stroke-width="3" class="cell-arrow" />
      <ArrowDown v-else-if="status === 'lower'" :size="14" :stroke-width="3" class="cell-arrow" />
      <span class="cell-label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Hotbar slot anatomy: 2px outer border + 1px inset highlight on top, 1px
   inset shadow on bottom. The same light-tier wood-frame the rest of the
   envelope uses on individual rows and cards. */
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 64px;
  padding: 6px 4px;
  border: 2px solid var(--paper-bd);
  background: var(--paper-light);
  color: var(--paper-text-strong);
  box-shadow:
    inset 0 1px 0 var(--paper-bd-light),
    inset 0 -1px 0 rgb(0 0 0 / 0.12);
  font-variant-numeric: tabular-nums;
}

.cell-attr {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.55;
  line-height: 1;
}

.cell-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
}

.cell-arrow {
  flex-shrink: 0;
}

.cell-label {
  letter-spacing: 0.02em;
}

/* ── Trio fills ──────────────────────────────────────────────────────
   Green match / gold close / red miss. White text on all three because
   parchment-text on a saturated fill is unreadable. The inset highlight
   shifts to a darker variant on filled cells so the pixel-frame feel
   carries through the color change. */
.cell[data-status='correct'] {
  background: var(--element-valid);
  color: rgb(255 255 255);
  border-color: var(--element-valid-sub);
  box-shadow:
    inset 0 1px 0 var(--element-valid-hover),
    inset 0 -1px 0 rgb(0 0 0 / 0.25);
}

.cell[data-status='partial'] {
  background: var(--element-warning);
  color: rgb(255 255 255);
  border-color: var(--element-warning-sub);
  box-shadow:
    inset 0 1px 0 var(--element-warning-hover),
    inset 0 -1px 0 rgb(0 0 0 / 0.25);
}

.cell[data-status='wrong'],
.cell[data-status='higher'],
.cell[data-status='lower'] {
  background: var(--element-danger);
  color: rgb(255 255 255);
  border-color: var(--element-danger-sub);
  box-shadow:
    inset 0 1px 0 var(--element-danger-hover),
    inset 0 -1px 0 rgb(0 0 0 / 0.25);
}

/* Override the attr label color on filled cells so it stays legible against
   the saturated background. */
.cell[data-status='correct'] .cell-attr,
.cell[data-status='partial'] .cell-attr,
.cell[data-status='wrong'] .cell-attr,
.cell[data-status='higher'] .cell-attr,
.cell[data-status='lower'] .cell-attr {
  color: rgb(255 255 255);
  opacity: 0.8;
}

@media (max-width: 720px) {
  .cell {
    min-height: 52px;
    padding: 4px 2px;
  }

  .cell-value {
    font-size: 12px;
  }

  .cell-attr {
    font-size: 7px;
  }
}
</style>
