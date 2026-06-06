import type { SearchIngredient } from './types'
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'

// Convert the runtime CDN `Ingredient` (hppeng shorthand: `lvl`, `posMods`)
// into the `SearchIngredient` shape expected by IngredientResultCard /
// IngredientTooltip (`level`, `positionModifiers`). Shared so the crafter
// picker and the filled-slot hover card can reuse the exact same mapping.
export function toSearchIngredient(ing: Ingredient): SearchIngredient {
  return {
    id: ing.id,
    name: ing.name,
    displayName: ing.displayName,
    tier: ing.tier,
    level: ing.lvl,
    skills: ing.skills,
    identifications: ing.identifications,
    itemOnlyIDs: ing.itemOnlyIDs as unknown as Record<string, number>,
    consumableOnlyIDs: ing.consumableOnlyIDs as unknown as Record<string, number>,
    positionModifiers: ing.posMods,
    droppedBy: [],
    icon: ing.icon,
  }
}
