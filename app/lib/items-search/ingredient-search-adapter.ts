import type { IdRange, PositionModifiers, SearchIngredient } from './types'

interface RawIngredient {
  id: number
  name?: string
  displayName?: string
  tier: number
  requirements?: { level?: number, skills?: string[] }
  identifications?: Record<string, IdRange>
  itemOnlyIDs?: Record<string, number>
  consumableOnlyIDs?: Record<string, number>
  ingredientPositionModifiers?: Partial<PositionModifiers>
  icon?: unknown
}

const ZERO_MODS: PositionModifiers = { above: 0, under: 0, left: 0, right: 0, touching: 0, notTouching: 0 }

type RawIngredientFile = { ingredients: RawIngredient[] } | Record<string, RawIngredient>

function toList(file: RawIngredientFile): RawIngredient[] {
  if (Array.isArray((file as { ingredients?: unknown }).ingredients))
    return (file as { ingredients: RawIngredient[] }).ingredients
  return Object.values(file as Record<string, RawIngredient>)
}

export function adaptIngredients(file: RawIngredientFile): SearchIngredient[] {
  return toList(file).map(ing => ({
    id: ing.id,
    name: ing.name ?? ing.displayName ?? String(ing.id),
    displayName: ing.displayName ?? ing.name ?? String(ing.id),
    tier: ing.tier ?? 0,
    level: ing.requirements?.level ?? 0,
    skills: ing.requirements?.skills ?? [],
    identifications: ing.identifications ?? {},
    itemOnlyIDs: ing.itemOnlyIDs ?? {},
    consumableOnlyIDs: ing.consumableOnlyIDs ?? {},
    positionModifiers: { ...ZERO_MODS, ...(ing.ingredientPositionModifiers ?? {}) },
    icon: ing.icon,
  }))
}
