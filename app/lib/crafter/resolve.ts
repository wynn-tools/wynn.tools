import type { Ingredient } from '../data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '../data/cdn-adapter/recipe-adapter'
import type { CraftContext, RawCraft } from './types'

export class CraftResolveError extends Error {}

export interface ResolvedCraft {
  recipe: Recipe
  ingredients: (Ingredient | null)[]
}

export function resolveCraft(raw: RawCraft, ctx: CraftContext): ResolvedCraft {
  const recipe = ctx.recipes.get(raw.recipeId)
  if (!recipe)
    throw new CraftResolveError(`recipe ${raw.recipeId} not found`)
  const ingredients = raw.ingredientIds.map(id =>
    id === null ? null : ctx.ingredients.get(id) ?? null,
  )
  return { recipe, ingredients }
}
