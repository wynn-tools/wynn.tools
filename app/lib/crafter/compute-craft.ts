import type { Ingredient } from '../data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '../data/cdn-adapter/recipe-adapter'
import type { AtkSpeed, CraftContext, CraftedItem, IdRange, RawCraft } from './types'
import { resolveCraft } from './resolve'

// ---------------------------------------------------------------------------
// computeCraft — pure crafting math. Mirrors WB `craft.js#initCraftStats`.
//
// Task 5 scope: recipe expansion, mat-tier scaling, identification + req
// aggregation. Effectiveness is stubbed at 100% (Task 6 will replace
// `computeEffectiveness` with the real 3×2 matrix). Powders are passed through
// but not applied (Task 7).
// ---------------------------------------------------------------------------

const WEAPON_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])
const ARMOR_TYPES = new Set(['helmet', 'chestplate', 'leggings', 'boots'])
const ACCESSORY_TYPES = new Set(['ring', 'necklace', 'bracelet'])
const CONSUMABLE_TYPES = new Set(['potion', 'scroll', 'food'])

const SKP_REQ_KEYS = ['strReq', 'dexReq', 'intReq', 'defReq', 'agiReq'] as const

// craft.js: `let tierToMult = [0, 1, 1.25, 1.4];`
const TIER_TO_MULT = [0, 1, 1.25, 1.4] as const

type Category = CraftedItem['category']

function categoryFor(type: string): Category {
  if (WEAPON_TYPES.has(type))
    return 'weapon'
  if (ARMOR_TYPES.has(type))
    return 'armor'
  if (ACCESSORY_TYPES.has(type))
    return 'accessory'
  if (CONSUMABLE_TYPES.has(type))
    return 'consumable'
  throw new Error(`computeCraft: unknown recipe type "${type}"`)
}

/**
 * craft.js lines 309-314:
 *   matmult = (tierToMult[t1]*amount1 + tierToMult[t2]*amount2) / (amount1+amount2)
 *
 * Recipes always have two materials. Fallback to 1 when amounts are missing so
 * unit tests with synthetic recipes don't divide-by-zero.
 */
function computeMatMult(recipe: Recipe, matTiers: [1 | 2 | 3, 1 | 2 | 3]): number {
  const mats = recipe.materials ?? []
  const a1 = mats[0]?.amount ?? 1
  const a2 = mats[1]?.amount ?? 1
  return (TIER_TO_MULT[matTiers[0]] * a1 + TIER_TO_MULT[matTiers[1]] * a2) / (a1 + a2)
}

/**
 * Slot count for armor/weapons. Consumables use `charges` instead (same formula).
 * craft.js lines 250-256 & 263-268.
 */
function slotsByLvlLow(lvlLow: number): number {
  if (lvlLow < 30)
    return 1
  if (lvlLow < 70)
    return 2
  return 3
}

/**
 * 3×2 effectiveness matrix in row-major order (flattened to 6 entries, one per
 * ingredient slot). Task 5 stubs this at flat 100%; Task 6 will replace it with
 * the actual position-modifier computation.
 */
export function computeEffectiveness(_ingredients: (Ingredient | null)[]): number[] {
  return [100, 100, 100, 100, 100, 100]
}

export function computeCraft(raw: RawCraft, ctx: CraftContext): CraftedItem {
  const { recipe, ingredients } = resolveCraft(raw, ctx)
  const category = categoryFor(recipe.type)
  const lvlLow = recipe.lvl[0]
  const lvl = recipe.lvl[1]

  // ---------- 1. Initialise output skeleton ----------
  const item: CraftedItem = {
    hash: '',
    category,
    type: recipe.type,
    tier: 'Crafted',
    lvlLow,
    lvl,
    identifications: {},
    reqs: { level: lvl },
    slots: 0,
    powders: raw.powders,
  }

  // Mat-tier scaling on durability/duration (per craft.js lines 309-326).
  const matmult = computeMatMult(recipe, raw.matTiers)

  if (category === 'consumable') {
    const dur = recipe.duration ?? [0, 0]
    item.duration = [Math.round(dur[0] * matmult), Math.round(dur[1] * matmult)]
    item.charges = slotsByLvlLow(lvlLow)
    // slots stays 0 for consumables (per task spec)
  }
  else {
    const dura = recipe.durability ?? [0, 0]
    item.durability = [Math.round(dura[0] * matmult), Math.round(dura[1] * matmult)]
    if (category === 'weapon' || category === 'armor')
      item.slots = slotsByLvlLow(lvlLow)
    // accessories: slots stays 0
  }

  // hp / damage scaling for armor & weapons (mat-tier-scaled base ranges).
  // Weapons need attack-speed handling for damage; for Task 5 we only carry the
  // override and skip damage range computation if no override.
  if (category === 'armor' && recipe.hp) {
    const low = Math.floor(recipe.hp[0] * matmult)
    const high = Math.floor(recipe.hp[1] * matmult)
    item.hp = [low, high]
  }

  // ---------- 2. Aggregate ingredient identifications & itemIDs ----------
  const eff = computeEffectiveness(ingredients)

  // Sum buckets keyed by the adapter's shorthand key.
  const idMin: Record<string, number> = {}
  const idMax: Record<string, number> = {}
  const reqs: Record<string, number> = { strReq: 0, dexReq: 0, intReq: 0, defReq: 0, agiReq: 0 }
  let durabilityModifierSum = 0
  let chargesSum = 0
  let durationModifierSum = 0

  for (let n = 0; n < ingredients.length; n++) {
    const ing = ingredients[n]
    if (!ing)
      continue
    const effMult = eff[n] / 100

    // identifications: scale {min,max} by effectiveness, floor, sort (per
    // craft.js lines 484-491).
    for (const [key, entry] of Object.entries(ing.identifications)) {
      const rawMin = entry.min
      const rawMax = entry.max
      if (rawMax === 0 && rawMin === 0)
        continue
      const rolls = [Math.floor(rawMin * effMult), Math.floor(rawMax * effMult)]
        .sort((a, b) => a - b)
      idMin[key] = (idMin[key] ?? 0) + rolls[0]
      idMax[key] = (idMax[key] ?? 0) + rolls[1]
    }

    // itemOnlyIDs: reqs scaled by effectiveness (skipped on consumables, per
    // craft.js line 466). durabilityModifier is NEVER scaled (line 472-474).
    if (category !== 'consumable') {
      for (const skp of SKP_REQ_KEYS) {
        const v = ing.itemOnlyIDs[skp]
        if (v)
          reqs[skp] = Math.round(reqs[skp] + v * effMult)
      }
    }
    // Durability modifier applies to weapons/armor (accessories carry no
    // durability). craft.js does it unconditionally inside the loop, but only
    // weapons/armor have a `durability` field, so this is a no-op elsewhere.
    if (category === 'weapon' || category === 'armor')
      durabilityModifierSum += ing.itemOnlyIDs.durabilityModifier

    // consumableOnlyIDs (consumables only — craft.js lines 476-483).
    if (category === 'consumable') {
      durationModifierSum += ing.consumableOnlyIDs.duration
      chargesSum += ing.consumableOnlyIDs.charges
    }
  }

  // ---------- 3. Apply durability modifier & finalise durability/duration ----------
  if (item.durability) {
    const [lo, hi] = item.durability
    // craft.js line 493-501: floor each, clamp below-1 to 0.
    item.durability = [
      Math.max(0, Math.floor(lo + durabilityModifierSum)),
      Math.max(0, Math.floor(hi + durabilityModifierSum)),
    ]
  }
  if (item.duration) {
    // craft.js line 502-507: <1 clamps to 1 (when ingredients are present).
    const [lo, hi] = item.duration
    item.duration = [
      Math.max(1, lo + durationModifierSum),
      Math.max(1, hi + durationModifierSum),
    ]
  }
  if (item.charges !== undefined) {
    item.charges = Math.max(1, item.charges + chargesSum)
  }

  // ---------- 4. Identifications output ----------
  for (const key of Object.keys(idMax)) {
    const minVal = idMin[key] ?? 0
    const maxVal = idMax[key] ?? 0
    if (minVal === 0 && maxVal === 0)
      continue
    item.identifications[key] = { min: minVal, max: maxVal } as IdRange
  }

  // ---------- 5. Requirements (skillpoints): max(0, sum) ----------
  if (category !== 'consumable') {
    for (const skp of SKP_REQ_KEYS)
      item.reqs[skp] = Math.max(0, reqs[skp])
  }

  // ---------- 6. Atk-spd override (weapons only) ----------
  if (category === 'weapon' && raw.atkSpdOverride)
    item.atkSpd = raw.atkSpdOverride as AtkSpeed

  return item
}
