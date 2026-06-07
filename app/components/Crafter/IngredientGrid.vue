<script setup lang="ts">
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'
import { computed } from 'vue'
import { useCraftMarket } from '~/composables/useCraftMarket'
import { computeAffectedCells, computeEffectiveness } from '~/lib/crafter/compute-craft'
import { formatEmeralds } from '~/lib/market/format-emeralds'
import { pickId } from '~/lib/market/summarize'
import { useCraftStore } from '~/stores/craft'

const props = defineProps<{
  openSlot: number | null
  hoveredIngredient: Ingredient | null
}>()

const emit = defineEmits<{
  open: [index: number]
}>()

const store = useCraftStore()
const { mode, priceFor } = useCraftMarket()

function priceFormatted(ing: Ingredient | null): string | null {
  if (!ing)
    return null
  const tier = typeof ing.tier === 'number' ? ing.tier : null
  const p = priceFor(ing.name, tier)
  if (!p)
    return null
  const v = pickId(p, mode.value)
  return v == null ? null : formatEmeralds(v)
}

const slotIngredients = computed<(Ingredient | null)[]>(() => {
  const ctx = store.ctx
  const ids = store.raw.ingredientIds
  return ids.map((id) => {
    if (id == null || !ctx)
      return null
    return ctx.ingredients.get(id) ?? null
  })
})

// Real effectiveness from currently-placed ingredients. Always defined for all
// six slots — `computeEffectiveness` returns a flat 6-entry row-major array.
const effectiveness = computed<number[]>(() => computeEffectiveness(slotIngredients.value))

// Preview effectiveness: what the matrix would look like if the hovered
// ingredient were virtually placed in the open slot. Null when nothing's hovered.
const previewEffectiveness = computed<number[] | null>(() => {
  const ing = props.hoveredIngredient
  const from = props.openSlot
  if (!ing || from == null)
    return null
  const virt = slotIngredients.value.slice()
  virt[from] = ing
  return computeEffectiveness(virt)
})

const highlightedCells = computed<Set<number>>(() => {
  const ing = props.hoveredIngredient
  const from = props.openSlot
  if (!ing || from == null)
    return new Set()
  return computeAffectedCells(ing, from)
})

function isPreviewing(i: number): boolean {
  if (previewEffectiveness.value === null)
    return false
  // The source slot is also "previewing" — the user is deciding for it,
  // so its own would-be effectiveness matters even though
  // `computeAffectedCells` deliberately excludes it.
  return highlightedCells.value.has(i) || props.openSlot === i
}

function effFor(i: number): number {
  if (isPreviewing(i) && previewEffectiveness.value)
    return previewEffectiveness.value[i]
  return effectiveness.value[i]
}

function isHighlighted(i: number): boolean {
  // Visual accent on the source slot too while previewing, so the user can
  // see at a glance which slot they're filling.
  return highlightedCells.value.has(i) || (props.hoveredIngredient !== null && props.openSlot === i)
}

function onClear(index: number) {
  store.setIngredient(index, null)
}
</script>

<template>
  <div class="grid-wrap">
    <div class="grid" role="group" aria-label="Ingredient slots">
      <CrafterIngredientSlot
        v-for="(ing, i) in slotIngredients"
        :key="i"
        :index="i"
        :ingredient="ing"
        :highlighted="isHighlighted(i)"
        :effectiveness="effFor(i)"
        :previewing="isPreviewing(i)"
        :price="priceFormatted(ing)"
        @open="emit('open', i)"
        @clear="onClear(i)"
      />
    </div>
  </div>
</template>

<style scoped>
.grid-wrap {
  width: 100%;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(3, auto);
  gap: 10px;
}

@media (max-width: 480px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(6, auto);
  }
}
</style>
