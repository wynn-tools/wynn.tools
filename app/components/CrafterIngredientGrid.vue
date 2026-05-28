<script setup lang="ts">
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'
import { computed, ref } from 'vue'
import { computeAffectedCells } from '~/lib/crafter/compute-craft'
import { useCraftStore } from '~/stores/craft'

const store = useCraftStore()

const openSlot = ref<number | null>(null)
const hoveredIngredient = ref<Ingredient | null>(null)

const slotIngredients = computed<(Ingredient | null)[]>(() => {
  const ctx = store.ctx
  const ids = store.raw.ingredientIds
  return ids.map((id) => {
    if (id == null || !ctx)
      return null
    return ctx.ingredients.get(id) ?? null
  })
})

const highlightedCells = computed<Set<number>>(() => {
  const ing = hoveredIngredient.value
  const from = openSlot.value
  if (!ing || from == null)
    return new Set()
  return computeAffectedCells(ing, from)
})

function openPicker(index: number) {
  openSlot.value = index
}

function closePicker() {
  openSlot.value = null
  hoveredIngredient.value = null
}

function onSelect(id: number | null) {
  if (openSlot.value == null)
    return
  store.setIngredient(openSlot.value, id)
  closePicker()
}

function onClear(index: number) {
  store.setIngredient(index, null)
}

function onHoverIngredient(ing: Ingredient | null) {
  hoveredIngredient.value = ing
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
        :highlighted="highlightedCells.has(i)"
        @open="openPicker(i)"
        @clear="onClear(i)"
      />
    </div>
    <CrafterIngredientPicker
      v-if="openSlot !== null"
      :slot-index="openSlot"
      @select="onSelect"
      @close="closePicker"
      @hover-ingredient="onHoverIngredient"
    />
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
