<script setup lang="ts">
import type { CellStatus } from '~/lib/wynndle/types'
import { ArrowDown, ArrowUp } from '@lucide/vue'
import { TIER_COLORS } from '~/lib/items/tooltip'

const props = defineProps<{
  status: CellStatus
  label?: string | number
  /** When provided, render Wynncraft element sprites instead of label text. */
  elements?: string[]
  /** When provided, tint the label with the in-game rarity hex (game-world
   *  semantics carve-out, same as the item name in IdentityCell). */
  rarity?: string
}>()

const labelColor = computed(() => {
  if (!props.rarity)
    return undefined
  const key = props.rarity.charAt(0).toUpperCase() + props.rarity.slice(1).toLowerCase()
  return TIER_COLORS[key] ?? TIER_COLORS.Normal
})
</script>

<template>
  <div class="cell" :data-status="status">
    <div class="cell-value">
      <ArrowUp v-if="status === 'higher'" :size="14" :stroke-width="3" class="cell-arrow" />
      <ArrowDown v-else-if="status === 'lower'" :size="14" :stroke-width="3" class="cell-arrow" />
      <span v-if="elements" class="cell-elements">
        <img
          v-for="el in elements"
          :key="el"
          :src="`https://cdn.wynn.tools/nextgen/items/v2/attributes/${el}.png`"
          :alt="el"
          width="14"
          height="14"
          class="cell-elem-icon"
          loading="lazy"
          decoding="async"
        >
      </span>
      <span
        v-else
        class="cell-label"
        :class="{ 'cell-label--rarity': labelColor }"
        :data-rarity="rarity ? rarity.toLowerCase() : undefined"
        :style="labelColor ? { color: labelColor } : undefined"
      >{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.cell {
  /* container-type lets .cell-value scale its font-size to the cell's actual
     inline size (cqi). The grid lays out 7 attribute cells across a parent
     that can be anywhere from ~80px to ~130px per cell depending on board
     width; container queries hit the right size for whichever cell it is. */
  container-type: inline-size;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 4px 6px;
  border: 2px solid var(--paper-bd);
  background: var(--paper-light);
  color: var(--paper-text-strong);
  box-shadow:
    inset 0 1px 0 var(--paper-bd-light),
    inset 0 -1px 0 rgb(0 0 0 / 0.12);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
}

.cell-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  font-family: var(--font-mono);
  /* 11cqi keeps LEGENDARY (9-char mono) inside the cell across the full
     desktop board-width range. Upper bound 14px — at 15px Geist Mono renders
     just wide enough to clip the trailing Y on ~130px cells. */
  font-size: clamp(10px, 11cqi, 14px);
  line-height: 1;
  white-space: nowrap;
  text-overflow: clip;
}

.cell-arrow {
  flex-shrink: 0;
}

.cell-label {
  letter-spacing: 0;
}

/* Rarity-tinted label: matches the IdentityCell treatment so the rarity word
   reads as game-world type. Hard 1.5px shadow lifts contrast over the trio
   backgrounds (green/gold/red), echoing the in-game tooltip pixel shadow. */
.cell-label--rarity {
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.55);
}

/* LEGENDARY is the longest rarity word (9 chars). Even with the cqi-scaled
   value font, it crowds the cell at narrow board widths — pull it down a
   notch with em-relative scaling so it tracks the surrounding clamp. */
.cell-label--rarity[data-rarity='legendary'] {
  font-size: 0.85em;
}

.cell-elements {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
  max-width: 100%;
}

.cell-elem-icon {
  display: block;
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
  flex-shrink: 0;
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

@media (max-width: 720px) {
  .cell {
    min-height: 52px;
    padding: 4px 4px;
  }

  .cell-value {
    /* Mobile cells run ~40–60px wide; widen the clamp range so the value
       scales further down without going illegible. */
    font-size: clamp(9px, 14cqi, 13px);
  }

  .cell-elem-icon {
    width: 12px;
    height: 12px;
  }
}
</style>
