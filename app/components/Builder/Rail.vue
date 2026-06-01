<script setup lang="ts">
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui'
import { computed } from 'vue'
import { useBuilderRail } from '~/composables/useBuilderRail'
import { EQUIP_SLOT_COUNT, SLOT_LABELS } from '~/lib/builder-draft/routing'
import { itemIconUrl } from '~/lib/items/icon'
import { TIER_COLORS } from '~/lib/items/tooltip'

defineEmits<{ expand: [] }>()

const rail = useBuilderRail()

// CSS grid-area names, matching the builder's EquipmentGrid template.
const SLOT_AREAS = ['helmet', 'chest', 'legs', 'boots', 'ring1', 'ring2', 'bracelet', 'necklace', 'weapon'] as const
// First-letter glyph for empty slots; position in the grid carries the role.
const SLOT_CAPTIONS = ['H', 'C', 'L', 'B', 'R', 'R', 'B', 'N', 'W'] as const

const slots = computed(() =>
  SLOT_LABELS.map((label, i) => {
    const item = rail.itemFor(rail.previewIds.value[i] ?? null)
    return {
      i,
      label,
      area: SLOT_AREAS[i],
      caption: SLOT_CAPTIONS[i],
      item,
      icon: item ? itemIconUrl(item) : null,
      tier: item ? (TIER_COLORS[item.tier] ?? null) : null,
    }
  }),
)
</script>

<template>
  <section class="rail" aria-label="Build preview">
    <div class="rail-main">
      <button
        type="button"
        class="rail-open"
        :aria-expanded="rail.open.value"
        :aria-label="`Open full builder, ${rail.count.value} of ${EQUIP_SLOT_COUNT} equipped`"
        @click="$emit('expand')"
      >
        <span class="rail-open-chevron" aria-hidden="true">‹</span>
      </button>

      <div class="rail-grid">
        <template v-for="s in slots" :key="s.i">
          <HoverCardRoot v-if="s.item" :open-delay="200" :close-delay="0">
            <HoverCardTrigger as-child>
              <button
                type="button"
                class="cell cell--filled"
                :class="{ 'cell--wide': s.area === 'weapon' }"
                :style="{ 'gridArea': s.area, '--tier': s.tier ?? 'var(--color-border)' }"
                :aria-label="`Remove ${s.item.displayName} from ${s.label}`"
                @click="rail.removeSlot(s.i)"
              >
                <img v-if="s.icon" :src="s.icon" class="cell-icon" alt="" aria-hidden="true">
                <span v-else class="cell-glyph" aria-hidden="true">{{ s.caption }}</span>
                <span class="cell-remove" aria-hidden="true">×</span>
              </button>
            </HoverCardTrigger>
            <HoverCardPortal>
              <HoverCardContent side="left" align="center" :side-offset="10" class="rail-quickview">
                <div class="rail-quickview-scale">
                  <ItemTooltip :item="s.item" />
                </div>
              </HoverCardContent>
            </HoverCardPortal>
          </HoverCardRoot>

          <div
            v-else
            class="cell cell--empty"
            :class="{ 'cell--wide': s.area === 'weapon' }"
            :style="{ gridArea: s.area }"
            aria-hidden="true"
          >
            <span class="cell-caption">{{ s.caption }}</span>
          </div>
        </template>
      </div>
    </div>

    <div class="rail-foot">
      <span class="rail-meta">
        <span class="kicker">Build</span>
        <span class="rail-count">{{ rail.count.value }}/{{ EQUIP_SLOT_COUNT }}</span>
      </span>
      <button
        v-if="!rail.isEmpty.value"
        type="button"
        class="rail-clear"
        @click="rail.clear()"
      >
        Clear
      </button>
    </div>

    <p v-if="rail.isEmpty.value" class="rail-hint">
      Equip from search to build.
    </p>
  </section>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  /* Pinned to the vertical middle of the viewport, in the right-hand gutter the
     grid still reserves (var(--rail-w)). The right offset matches the page
     shell: a centred max-width container with 40px side padding. */
  position: fixed;
  z-index: 30;
  top: 50dvh;
  right: max(40px, calc((100vw - min(100vw, var(--shell-max))) / 2 + 40px));
  transform: translateY(-50%);
  width: var(--rail-w, 124px);
}

.rail-main {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

/* The primary affordance: a tall chevron left of the slots that opens the
   builder panel (which slides in from the right). */
.rail-open {
  flex-shrink: 0;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out,
    background 0.12s ease-out;
}
.rail-open:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
.rail-open:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.rail-open-chevron {
  font-size: 28px;
  line-height: 0;
  transition: transform 0.15s ease-out;
}
.rail-open:hover .rail-open-chevron {
  transform: translateX(-3px);
}

.rail-grid {
  --cell: 36px;
  display: grid;
  grid-template-columns: repeat(2, var(--cell));
  grid-template-areas:
    'helmet   ring1'
    'chest    ring2'
    'legs     bracelet'
    'boots    necklace'
    'weapon   weapon';
  gap: 4px;
  justify-content: end;
}

.cell {
  position: relative;
  width: var(--cell);
  height: var(--cell);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  padding: 0;
}
/* Weapon spans both columns; keep the tile square and centre it in that row. */
.cell--wide {
  justify-self: center;
}

.cell--empty {
  border: 1px dashed color-mix(in oklch, var(--color-border) 80%, transparent);
  background: color-mix(in oklch, var(--color-surface) 40%, transparent);
}
.cell-caption {
  font: 500 12px/1 var(--font-mono);
  text-transform: uppercase;
  color: var(--color-faint);
  opacity: 0.55;
}

.cell--filled {
  cursor: pointer;
  border: 1px solid color-mix(in oklch, var(--tier) 55%, var(--color-border));
  background:
    radial-gradient(circle at 50% 38%, color-mix(in oklch, var(--tier) 14%, transparent), transparent 70%),
    var(--color-surface);
  transition:
    border-color 0.12s ease-out,
    box-shadow 0.12s ease-out;
}
.cell--filled:hover {
  border-color: var(--tier);
  box-shadow: 0 0 0 1px color-mix(in oklch, var(--tier) 40%, transparent);
}
.cell--filled:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.cell-icon {
  width: 28px;
  height: 28px;
  image-rendering: pixelated;
  transition: opacity 0.12s ease-out;
}
.cell-glyph {
  font: 600 14px/1 var(--font-display);
  color: color-mix(in oklch, var(--tier) 80%, var(--color-text));
  transition: opacity 0.12s ease-out;
}
/* Hover/focus a filled cell reads as "click to remove": the icon recedes and a
   centred × takes over. */
.cell--filled:hover .cell-icon,
.cell--filled:hover .cell-glyph,
.cell--filled:focus-visible .cell-icon,
.cell--filled:focus-visible .cell-glyph {
  opacity: 0.2;
}
.cell-remove {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  color: var(--color-text);
  opacity: 0;
  transition: opacity 0.12s ease-out;
}
.cell--filled:hover .cell-remove,
.cell--filled:focus-visible .cell-remove {
  opacity: 1;
}

.rail-foot {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.rail-meta {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.rail-count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--color-text);
}
.rail-clear {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  cursor: pointer;
  transition: color 0.12s ease-out;
}
.rail-clear:hover {
  color: var(--color-muted);
}
.rail-clear:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.rail-hint {
  font-size: 11px;
  line-height: 1.4;
  text-align: right;
  color: var(--color-muted);
  max-width: 17ch;
}

.rail-quickview {
  z-index: 60;
}
.rail-quickview-scale {
  zoom: 0.7;
}

/* Touch: the rail renders inside the mobile bottom sheet, where the cells are
   real tap targets. Grow them past the 44px minimum. */
@media (pointer: coarse) {
  .rail-grid {
    --cell: 46px;
    gap: 6px;
  }
  .cell-icon {
    width: 32px;
    height: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rail-open-chevron,
  .cell--filled,
  .cell-icon,
  .cell-glyph,
  .cell-remove {
    transition: none;
  }
}
</style>
