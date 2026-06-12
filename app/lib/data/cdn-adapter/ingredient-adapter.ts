import type { IdentificationEntry } from './item-adapter'
import { IDENTIFICATION_MAP, REQUIREMENT_MAP } from './key-maps'

// ---------------------------------------------------------------------------
// Input types (new normalized CDN schema)
// ---------------------------------------------------------------------------

export interface RawIngredientPosMods {
  above: number
  under: number
  left: number
  right: number
  touching: number
  notTouching: number
}

export interface RawIngredientItemOnlyIDs {
  durabilityModifier: number
  strengthRequirement?: number
  dexterityRequirement?: number
  intelligenceRequirement?: number
  defenceRequirement?: number
  agilityRequirement?: number
}

export interface RawIngredientConsumableOnlyIDs {
  charges: number
  duration: number
}

export interface RawIngredientRequirements {
  level: number
  skills: string[]
}

export interface RawIngredient {
  id: number
  name: string
  displayName?: string
  tier: number
  requirements: RawIngredientRequirements
  identifications?: Record<string, IdentificationEntry>
  itemOnlyIDs: RawIngredientItemOnlyIDs
  consumableOnlyIDs: RawIngredientConsumableOnlyIDs
  ingredientPositionModifiers: RawIngredientPosMods
  icon?: unknown
}

// ---------------------------------------------------------------------------
// Output types (hppeng shorthand)
// ---------------------------------------------------------------------------

export interface IngredientItemOnlyIDs {
  durabilityModifier: number
  strReq: number
  dexReq: number
  intReq: number
  defReq: number
  agiReq: number
}

export interface IngredientConsumableOnlyIDs {
  charges: number
  duration: number
}

export interface IngredientPosMods {
  above: number
  under: number
  left: number
  right: number
  touching: number
  notTouching: number
}

export interface Ingredient {
  id: number
  name: string
  displayName: string
  tier: number
  lvl: number
  skills: string[]
  identifications: Record<string, IdentificationEntry>
  itemOnlyIDs: IngredientItemOnlyIDs
  consumableOnlyIDs: IngredientConsumableOnlyIDs
  posMods: IngredientPosMods
  icon: unknown
}

// ---------------------------------------------------------------------------
// adaptIngredients — convert raw CDN ingredients to hppeng shorthand
// ---------------------------------------------------------------------------

const SKILLPOINT_REQ_KEYS = [
  'strength',
  'dexterity',
  'intelligence',
  'defence',
  'agility',
] as const

export function adaptIngredients(raw: { ingredients: RawIngredient[] }): Ingredient[] {
  return raw.ingredients.map(adaptOne)
}

function adaptOne(r: RawIngredient): Ingredient {
  // identifications: official key → wb shorthand via IDENTIFICATION_MAP.
  // Mirrors item-adapter: unmapped keys are skipped.
  const identifications: Record<string, IdentificationEntry> = {}
  for (const [key, val] of Object.entries(r.identifications ?? {})) {
    const shortKey = IDENTIFICATION_MAP[key]
    if (shortKey === undefined)
      continue
    identifications[shortKey] = val
  }

  // itemOnlyIDs: skillpoint reqs mapped via REQUIREMENT_MAP, plus durabilityModifier.
  const itemOnlyIDs: IngredientItemOnlyIDs = {
    durabilityModifier: r.itemOnlyIDs.durabilityModifier,
    strReq: 0,
    dexReq: 0,
    intReq: 0,
    defReq: 0,
    agiReq: 0,
  }
  for (const skp of SKILLPOINT_REQ_KEYS) {
    const shortKey = REQUIREMENT_MAP[skp] as keyof IngredientItemOnlyIDs
    const v = r.itemOnlyIDs[`${skp}Requirement` as keyof RawIngredientItemOnlyIDs] ?? 0
    itemOnlyIDs[shortKey] = v as number
  }

  return {
    id: r.id,
    name: r.name,
    displayName: r.displayName ?? r.name,
    tier: r.tier,
    lvl: r.requirements.level,
    skills: r.requirements.skills,
    identifications,
    itemOnlyIDs,
    consumableOnlyIDs: {
      charges: r.consumableOnlyIDs.charges,
      duration: r.consumableOnlyIDs.duration,
    },
    posMods: {
      above: r.ingredientPositionModifiers.above,
      under: r.ingredientPositionModifiers.under,
      left: r.ingredientPositionModifiers.left,
      right: r.ingredientPositionModifiers.right,
      touching: r.ingredientPositionModifiers.touching,
      notTouching: r.ingredientPositionModifiers.notTouching,
    },
    icon: r.icon,
  }
}
