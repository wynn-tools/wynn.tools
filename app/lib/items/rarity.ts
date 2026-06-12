/**
 * Canonical Wynncraft rarity colors. The item rarity palette mirrors the
 * in-game tooltip (TIER_THEME in ./tooltip); the ingredient tier palette
 * mirrors the star colors used in the in-game ingredient tooltip.
 *
 * These are walled-garden game-data colors — they live alongside item data,
 * not in the UI design tokens, per DESIGN.md.
 */

import { TIER_COLORS } from './tooltip'

export type ItemRarity = keyof typeof TIER_COLORS

/** Item rarity name (`Legendary`, `Mythic`, ...) → hex color. */
export const RARITY_COLORS = TIER_COLORS

/** Ingredient tier (1..3) → hex color. Tier 0 has no associated color. */
export const INGREDIENT_TIER_COLORS: Record<number, string> = {
  1: '#f6f734',
  2: '#ff44ff',
  3: '#07f2f0',
}

export function rarityColor(tier: string | undefined): string | null {
  if (!tier)
    return null
  return RARITY_COLORS[tier] ?? null
}

export function ingredientTierColor(tier: number | undefined): string | null {
  if (!tier)
    return null
  return INGREDIENT_TIER_COLORS[tier] ?? null
}
