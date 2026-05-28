import type { Ingredient } from '../data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '../data/cdn-adapter/recipe-adapter'
import type { CraftContext, RawCraft } from './types'
import { describe, expect, it } from 'vitest'
import { CraftResolveError, resolveCraft } from './resolve'

function makeRecipe(id: number): Recipe {
  return {
    id,
    type: 'weapon',
    skill: 'weaponsmithing',
    lvl: { min: 1, max: 5 },
    materials: [],
  } as unknown as Recipe
}

function makeIngredient(id: number): Ingredient {
  return { id, name: `ing-${id}` } as unknown as Ingredient
}

function makeCtx(): CraftContext {
  return {
    recipes: new Map<number, Recipe>([
      [1, makeRecipe(1)],
      [2, makeRecipe(2)],
    ]),
    ingredients: new Map<number, Ingredient>([
      [10, makeIngredient(10)],
      [20, makeIngredient(20)],
      [30, makeIngredient(30)],
    ]),
  }
}

describe('resolveCraft', () => {
  it('resolves known recipe and 6 ingredient slots with mix of null and real ids', () => {
    const ctx = makeCtx()
    const raw: RawCraft = {
      recipeId: 1,
      ingredientIds: [10, null, 20, null, 30, null],
      matTiers: [1, 1],
      atkSpdOverride: 'NORMAL',
      powders: [],
    }
    const result = resolveCraft(raw, ctx)
    expect(result.recipe).toBe(ctx.recipes.get(1))
    expect(result.ingredients).toHaveLength(6)
    expect(result.ingredients[0]).toBe(ctx.ingredients.get(10))
    expect(result.ingredients[1]).toBeNull()
    expect(result.ingredients[2]).toBe(ctx.ingredients.get(20))
    expect(result.ingredients[3]).toBeNull()
    expect(result.ingredients[4]).toBe(ctx.ingredients.get(30))
    expect(result.ingredients[5]).toBeNull()
  })

  it('throws CraftResolveError on unknown recipe id', () => {
    const ctx = makeCtx()
    const raw: RawCraft = {
      recipeId: 999,
      ingredientIds: [null, null, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }
    expect(() => resolveCraft(raw, ctx)).toThrow(CraftResolveError)
  })

  it('returns null at slot i when ingredient id is unknown (does not throw)', () => {
    const ctx = makeCtx()
    const raw: RawCraft = {
      recipeId: 2,
      ingredientIds: [10, 9999, 20, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }
    const result = resolveCraft(raw, ctx)
    expect(result.ingredients[0]).toBe(ctx.ingredients.get(10))
    expect(result.ingredients[1]).toBeNull()
    expect(result.ingredients[2]).toBe(ctx.ingredients.get(20))
    expect(result.ingredients[3]).toBeNull()
  })

  it('preserves null input slots as null in output', () => {
    const ctx = makeCtx()
    const raw: RawCraft = {
      recipeId: 1,
      ingredientIds: [null, null, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }
    const result = resolveCraft(raw, ctx)
    expect(result.ingredients).toEqual([null, null, null, null, null, null])
  })
})
