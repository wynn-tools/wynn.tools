<script setup lang="ts">
import type { Recipe } from '~/lib/data/cdn-adapter/recipe-adapter'
import { computed, watch } from 'vue'
import FilterCombobox from '~/components/FilterCombobox.vue'
import { useCraftStore } from '~/stores/craft'

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
const currentSkill = computed<string | null>(() => store.recipe?.skill ?? null)
const currentType = computed<string | null>(() => store.recipe?.type ?? null)
const currentLevel = computed<string | null>(() => {
  const r = store.recipe
  return r ? levelKey(r.lvl) : null
})

// ----- Option lists -----
const skillOptions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const r of allRecipes.value) set.add(r.skill)
  return Array.from(set).sort()
})

const typeOptions = computed<string[]>(() => {
  const skill = currentSkill.value
  if (!skill)
    return []
  const set = new Set<string>()
  for (const r of allRecipes.value) {
    if (r.skill === skill)
      set.add(r.type)
  }
  return Array.from(set).sort()
})

const levelOptions = computed<string[]>(() => {
  const skill = currentSkill.value
  const type = currentType.value
  if (!skill || !type)
    return []
  const set = new Set<string>()
  for (const r of allRecipes.value) {
    if (r.skill === skill && r.type === type)
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
function findRecipe(skill: string, type: string, level: string): Recipe | null {
  for (const r of allRecipes.value) {
    if (r.skill === skill && r.type === type && levelKey(r.lvl) === level)
      return r
  }
  return null
}

function applyTriple(skill: string, type: string, level: string): void {
  const match = findRecipe(skill, type, level)
  if (match && match.id !== store.raw.recipeId)
    store.setRecipe(match.id)
}

const skillModel = computed<string | null>({
  get: () => currentSkill.value,
  set: (value) => {
    if (!value || value === currentSkill.value)
      return
    // Pick first valid (type, level) under the new skill.
    const types = new Set<string>()
    let firstType: string | null = null
    for (const r of allRecipes.value) {
      if (r.skill === value) {
        firstType ??= r.type
        types.add(r.type)
      }
    }
    // Prefer keeping current type if available.
    const nextType = currentType.value && types.has(currentType.value) ? currentType.value : firstType
    if (!nextType)
      return
    // Pick first level under (skill, nextType); prefer current level if valid.
    const levels: string[] = []
    for (const r of allRecipes.value) {
      if (r.skill === value && r.type === nextType)
        levels.push(levelKey(r.lvl))
    }
    if (levels.length === 0)
      return
    const nextLevel = currentLevel.value && levels.includes(currentLevel.value) ? currentLevel.value : levels[0]!
    applyTriple(value, nextType, nextLevel)
  },
})

const typeModel = computed<string | null>({
  get: () => currentType.value,
  set: (value) => {
    const skill = currentSkill.value
    if (!skill || !value || value === currentType.value)
      return
    const levels: string[] = []
    for (const r of allRecipes.value) {
      if (r.skill === skill && r.type === value)
        levels.push(levelKey(r.lvl))
    }
    if (levels.length === 0)
      return
    const nextLevel = currentLevel.value && levels.includes(currentLevel.value) ? currentLevel.value : levels[0]!
    applyTriple(skill, value, nextLevel)
  },
})

const levelModel = computed<string | null>({
  get: () => currentLevel.value,
  set: (value) => {
    const skill = currentSkill.value
    const type = currentType.value
    if (!skill || !type || !value || value === currentLevel.value)
      return
    applyTriple(skill, type, value)
  },
})

// Self-heal if external state lands on an invalid combination after ctx loads.
watch(
  [allRecipes, currentSkill, currentType, currentLevel],
  () => {
    if (allRecipes.value.length === 0)
      return
    const skill = currentSkill.value
    const type = currentType.value
    const level = currentLevel.value
    if (!skill || !type || !level)
      return
    // If the current recipe id resolves cleanly, we're good — nothing to do.
    findRecipe(skill, type, level)
  },
  { immediate: true },
)
</script>

<template>
  <section class="recipe-panel">
    <header class="recipe-panel__header">
      <span class="kicker">Recipe</span>
    </header>
    <div class="recipe-panel__fields">
      <label class="field">
        <span class="field__label">Profession</span>
        <FilterCombobox
          v-model="skillModel"
          :options="skillOptions"
          placeholder="Select profession…"
        />
      </label>
      <label class="field">
        <span class="field__label">Item type</span>
        <FilterCombobox
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
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  font-family: 'wynn-default', system-ui, sans-serif;
}

.recipe-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.recipe-panel__fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.field__label {
  font-size: 11px;
  color: var(--color-muted);
  letter-spacing: 0.04em;
}

@media (min-width: 720px) {
  .recipe-panel__fields {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}
</style>
