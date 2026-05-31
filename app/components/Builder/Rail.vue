<script setup lang="ts">
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui'
import { computed } from 'vue'
import { useBuilderRail } from '~/composables/useBuilderRail'
import { SLOT_LABELS } from '~/lib/builder-draft/routing'
import { itemIconUrl } from '~/lib/items/icon'
import { TIER_COLORS } from '~/lib/items/tooltip'

defineEmits<{ expand: [] }>()

const rail = useBuilderRail()

// CSS grid-area names, matching the builder's EquipmentGrid template.
const SLOT_AREAS = ['helmet', 'chest', 'legs', 'boots', 'ring1', 'ring2', 'bracelet', 'necklace', 'weapon'] as const
// Short captions so empty slots read by role, not just position.
const SLOT_CAPTIONS = ['Helmet', 'Chest', 'Legs', 'Boots', 'Ring', 'Ring', 'Brace', 'Neck', 'Weapon'] as const

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
    <header class="rail-head">
      <button
        type="button"
        class="rail-toggle"
        :aria-expanded="rail.open.value"
        @click="$emit('expand')"
      >
        <span class="kicker">Build</span>
        <span class="rail-count">{{ rail.count.value }}/9</span>
        <span class="rail-chevron" aria-hidden="true">⌄</span>
      </button>
      <button
        v-if="!rail.isEmpty.value"
        type="button"
        class="rail-clear"
        @click="rail.clear()"
      >
        Clear
      </button>
    </header>

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
              <span v-else class="cell-glyph" aria-hidden="true">{{ s.caption.charAt(0) }}</span>
              <span class="cell-remove" aria-hidden="true">×</span>
            </button>
          </HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent side="left" align="start" :side-offset="8" class="rail-quickview">
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
          <span class="cell-caption">{{ s.caption.charAt(0) }}</span>
        </div>
      </template>
    </div>

    <p v-if="rail.isEmpty.value" class="rail-hint">
      Equip items from search to start a build.
    </p>
  </section>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 76px;
  align-self: start;
}

.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rail-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  margin: -5px -8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-muted);
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.rail-toggle:hover {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
.rail-toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.rail-count {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--color-text);
}
.rail-chevron {
  font-size: 13px;
  line-height: 1;
  transform: rotate(-90deg);
  transition: transform 0.15s ease-out;
}
.rail-toggle:hover .rail-chevron {
  transform: rotate(-90deg) translateX(2px);
}

.rail-clear {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 4px 6px;
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
  justify-content: start;
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
}
.cell-glyph {
  font: 600 14px/1 var(--font-display);
  color: color-mix(in oklch, var(--tier) 80%, var(--color-text));
}
.cell-remove {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 13px;
  line-height: 1;
  color: var(--color-faint);
  opacity: 0;
  transition: opacity 0.12s ease-out;
}
.cell--filled:hover .cell-remove,
.cell--filled:focus-visible .cell-remove {
  opacity: 1;
  color: var(--color-text);
}

.rail-hint {
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-faint);
  max-width: 22ch;
}

.rail-quickview {
  z-index: 60;
}
.rail-quickview-scale {
  zoom: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .rail-chevron,
  .cell--filled,
  .cell-remove {
    transition: none;
  }
}
</style>
