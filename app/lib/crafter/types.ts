import type { Ingredient } from '../data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '../data/cdn-adapter/recipe-adapter'

export type AtkSpeed = 'SLOW' | 'NORMAL' | 'FAST'

export interface RawCraft {
  recipeId: number
  ingredientIds: (number | null)[] // length 6
  matTiers: [1 | 2 | 3, 1 | 2 | 3]
  atkSpdOverride: AtkSpeed | null // null on non-weapons
  powders: number[]
}

export interface CraftContext {
  recipes: Map<number, Recipe>
  ingredients: Map<number, Ingredient>
}

export interface IdRange {
  min: number
  max: number
}

export interface CraftedItem {
  hash: string // "CR-" + base64
  category: 'weapon' | 'armor' | 'accessory' | 'consumable'
  type: string
  tier: 'Crafted'
  lvlLow: number
  lvl: number
  identifications: Record<string, IdRange>
  reqs: Record<string, number> // skp + level
  durability?: [number, number]
  duration?: [number, number]
  charges?: number
  hp?: [number, number]
  damage?: Record<string, [number, number]> // per element + neutral as min-max
  /**
   * Elemental defenses (static, non-rolled) keyed by element shorthand: eDef,
   * tDef, wDef, fDef, aDef. Populated by `applyPowders` on armor crafts;
   * weapons store powders in `powders` and defer damage application to dps.
   */
  defenses?: Record<string, number>
  atkSpd?: AtkSpeed
  slots: number
  powders: number[]
}
