import type { IdRange, SearchIngredient } from './types'

interface RawIngredient {
  id: number
  name?: string
  displayName?: string
  tier: number
  requirements?: { level?: number, skills?: string[] }
  identifications?: Record<string, IdRange>
  itemOnlyIDs?: Record<string, number>
  consumableOnlyIDs?: Record<string, number>
  icon?: unknown
}

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
    icon: ing.icon,
  }))
}
