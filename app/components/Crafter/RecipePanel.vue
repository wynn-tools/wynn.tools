<script setup lang="ts">
import type { Recipe } from '~/lib/data/cdn-adapter/recipe-adapter'
import { computed, watch } from 'vue'
import FilterCombobox from '~/components/FilterCombobox.vue'
import { useCraftStore } from '~/stores/craft'

const props = defineProps<{
  lockedType?: string | null
}>()

const store = useCraftStore()

function levelKey(lvl: readonly [number, number]): string {
  return `${lvl[0]}-${lvl[1]}`
}

const allRecipes = computed<Recipe[]>(() => {
  const ctx = store.ctx
  if (!ctx)
    return []
  return Array.from(ctx.recipes.values())
})

// ----- Derived current selections (from active recipe) -----
const currentType = computed<string | null>(() => store.recipe?.type ?? null)
const currentLevel = computed<string | null>(() => {
  const r = store.recipe
  return r ? levelKey(r.lvl) : null
})

// ----- Option lists -----
const typeOptions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const r of allRecipes.value) set.add(r.type)
  return Array.from(set).sort()
})

const levelOptions = computed<string[]>(() => {
  const type = currentType.value
  if (!type)
    return []
  const set = new Set<string>()
  for (const r of allRecipes.value) {
    if (r.type === type)
      set.add(levelKey(r.lvl))
  }
  // Sort numerically by lower bound.
  return Array.from(set).sort((a, b) => {
    const aLo = Number.parseInt(a.split('-')[0]!, 10)
    const bLo = Number.parseInt(b.split('-')[0]!, 10)
    return aLo - bLo
  })
})

// ----- v-model bridges -----
function findRecipe(type: string, level: string): Recipe | null {
  for (const r of allRecipes.value) {
    if (r.type === type && levelKey(r.lvl) === level)
      return r
  }
  return null
}

function applyPair(type: string, level: string): void {
  const match = findRecipe(type, level)
  if (match && match.id !== store.raw.recipeId)
    store.setRecipe(match.id)
}

const typeModel = computed<string | null>({
  get: () => currentType.value,
  set: (value) => {
    if (!value || value === currentType.value)
      return
    const levels: string[] = []
    for (const r of allRecipes.value) {
      if (r.type === value)
        levels.push(levelKey(r.lvl))
    }
    if (levels.length === 0)
      return
    const nextLevel = currentLevel.value && levels.includes(currentLevel.value) ? currentLevel.value : levels[0]!
    applyPair(value, nextLevel)
  },
})

const levelModel = computed<string | null>({
  get: () => currentLevel.value,
  set: (value) => {
    const type = currentType.value
    if (!type || !value || value === currentLevel.value)
      return
    applyPair(type, value)
  },
})

// When embedded with a locked type, auto-select on mount and whenever the
// context loads (allRecipes populates asynchronously).
watch(
  [() => props.lockedType, allRecipes],
  ([locked]) => {
    if (locked && locked !== currentType.value && allRecipes.value.length > 0)
      typeModel.value = locked
  },
  { immediate: true },
)
</script>

<template>
  <section class="recipe-panel" aria-label="Recipe">
    <div class="recipe-panel__fields">
      <label class="field">
        <span class="field__label">Item type</span>
        <span v-if="lockedType" class="field__locked">{{ lockedType }}</span>
        <FilterCombobox
          v-else
          v-model="typeModel"
          :options="typeOptions"
          placeholder="Select type…"
        />
      </label>
      <label class="field">
        <span class="field__label">Level range</span>
        <FilterCombobox
          v-model="levelModel"
          :options="levelOptions"
          placeholder="Select level…"
        />
      </label>
    </div>
  </section>
</template>

<style scoped>
.recipe-panel {
  display: flex;
  font-family: 'wynn-default', system-ui, sans-serif;
  min-width: 0;
}

.recipe-panel__fields {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: flex-end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  max-width: 200px;
}

.field__label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.field__locked {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-muted);
  text-transform: capitalize;
  padding: 4px 0;
}

@media (max-width: 720px) {
  .recipe-panel,
  .recipe-panel__fields {
    width: 100%;
  }
  .recipe-panel__fields {
    gap: 10px;
  }
  .field {
    flex: 1;
    min-width: 0;
    max-width: none;
  }
}
</style>
