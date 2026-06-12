<script setup lang="ts">
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'
import { computed } from 'vue'
import { toSearchIngredient } from '~/lib/items-search/ingredient-to-search'
import { ID_BAD_COLOR, ID_GOOD_COLOR } from '~/lib/items/tooltip'

const props = withDefaults(defineProps<{
  index: number
  ingredient: Ingredient | null
  highlighted?: boolean
  effectiveness?: number
  previewing?: boolean
  price?: string | null
}>(), {
  highlighted: false,
  effectiveness: undefined,
  previewing: false,
  price: null,
})

const emit = defineEmits<{
  open: []
  clear: []
}>()

const effAriaLabel = computed<string | undefined>(() => {
  if (props.effectiveness === undefined)
    return undefined
  return props.previewing
    ? `Effectiveness would become ${props.effectiveness}%`
    : `Effectiveness ${props.effectiveness}%`
})

const emptyAriaLabel = computed<string>(() => {
  const base = `Add ingredient to slot ${props.index + 1}`
  if (props.effectiveness === undefined)
    return base
  return props.previewing
    ? `${base}. Effectiveness would become ${props.effectiveness}%.`
    : `${base}. Effectiveness ${props.effectiveness}%.`
})

// Slots are laid out in a 2-column grid; odd-index slots sit in the right
// column where a right-side tooltip would be clipped. Pick `left` for those
// and `right` for the left column so the WB-style card has room to expand.
const tooltipSide = computed<'left' | 'right'>(() => (props.index % 2 === 1 ? 'left' : 'right'))

const searchIngredient = computed(() => (props.ingredient ? toSearchIngredient(props.ingredient) : null))

// Reuse the same hex tokens the tooltip uses for positive/negative ID rolls —
// keeps "good"/"bad" colouring consistent without a new palette entry.
const idGoodColor = ID_GOOD_COLOR
const idBadColor = ID_BAD_COLOR

function effClass(eff: number): string {
  if (eff > 100)
    return 'eff--good'
  if (eff < 100)
    return 'eff--bad'
  return 'eff--neutral'
}

function formatEff(eff: number): string {
  // 130 -> "130%"; -15 -> "-15%". Show the raw signed number with a percent.
  return `${eff}%`
}

const TIER_COLOR: Record<number, string> = {
  0: '#cccccc',
  1: '#f6f734',
  2: '#ff44ff',
  3: '#07f2f0',
}

function nameColor(tier: number | undefined): string {
  if (tier === undefined)
    return '#fff'
  return TIER_COLOR[tier] ?? '#fff'
}

function onClear(e: MouseEvent) {
  e.stopPropagation()
  emit('clear')
}
</script>

<template>
  <Quickview v-if="ingredient && searchIngredient" :open-delay="0" :side="tooltipSide">
    <template #trigger>
      <button
        type="button"
        class="slot slot--filled"
        :class="{ 'slot--highlighted': highlighted }"
        :aria-label="`Ingredient ${index + 1}: ${ingredient.displayName}`"
        @click="emit('open')"
      >
        <div class="slot-body">
          <span class="slot-name" :style="{ color: nameColor(ingredient.tier) }">{{ ingredient.displayName }}</span>
          <span class="slot-meta">
            Tier {{ ingredient.tier }} · Lv. {{ ingredient.lvl }}
            <span v-if="price" class="slot-price">· {{ price }}</span>
          </span>
        </div>
        <span
          v-if="effectiveness !== undefined"
          class="slot-eff"
          :class="effClass(effectiveness)"
          :aria-label="effAriaLabel"
        >
          [{{ formatEff(effectiveness) }}]
        </span>
        <button
          type="button"
          class="slot-clear"
          aria-label="Clear ingredient"
          @click="onClear"
        >
          ✕
        </button>
      </button>
    </template>
    <IngredientTooltip :ingredient="searchIngredient" />
  </Quickview>
  <button
    v-else
    type="button"
    class="slot"
    :class="{ 'slot--highlighted': highlighted }"
    :aria-label="emptyAriaLabel"
    @click="emit('open')"
  >
    <span class="slot-plus" aria-hidden="true">+</span>
    <span class="slot-empty-label">Add ingredient</span>
    <span
      v-if="effectiveness !== undefined"
      class="slot-eff slot-eff--empty"
      :class="effClass(effectiveness)"
      aria-hidden="true"
    >
      [{{ formatEff(effectiveness) }}]
    </span>
  </button>
</template>

<style scoped>
.slot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px 12px;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-muted);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.12s ease-out,
    box-shadow 0.12s ease-out,
    background 0.12s ease-out;
  font-family: var(--font-mono);
}

.slot--filled {
  border-style: solid;
}

.slot--highlighted {
  border-color: var(--color-accent);
}

.slot--highlighted::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: color-mix(in oklch, var(--color-accent) 25%, transparent);
  pointer-events: none;
}

.slot:hover {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent) inset;
}

.slot:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.slot-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.slot-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-meta {
  font-size: 11px;
  color: var(--color-muted);
}

.slot-price {
  color: var(--color-faint);
}

.slot-plus {
  font-size: 18px;
  color: var(--color-faint);
  line-height: 1;
}

.slot-empty-label {
  font-size: 12px;
  color: var(--color-muted);
}

.slot-clear {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 3px;
  transition:
    color 0.1s,
    background 0.1s;
}

.slot-clear:hover {
  color: var(--color-text);
  background: var(--color-border);
}

.slot-body,
.slot-plus,
.slot-empty-label,
.slot-clear,
.slot-eff {
  position: relative;
  z-index: 1;
}

.slot-eff {
  position: absolute;
  top: 6px;
  right: 28px;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.02em;
  pointer-events: none;
}

.slot-eff--empty {
  /* No clear button on empty slots — sit flush in the corner instead of
     offset for a ✕ that isn't there. */
  right: 10px;
}

.eff--good {
  color: v-bind(idGoodColor);
}

.eff--bad {
  color: v-bind(idBadColor);
}

.eff--neutral {
  color: var(--color-muted);
}

@media (max-width: 720px) {
  .slot {
    min-height: 60px;
    padding: 10px 12px;
  }
  .slot-name {
    font-size: 13px;
  }
  .slot-eff {
    top: 8px;
    right: 32px;
    font-size: 11px;
  }
  .slot-clear {
    padding: 8px;
    font-size: 14px;
  }
}
</style>
