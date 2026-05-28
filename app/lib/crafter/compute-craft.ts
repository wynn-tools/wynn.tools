import type { Ingredient } from '../data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '../data/cdn-adapter/recipe-adapter'
import type { AtkSpeed, CraftContext, CraftedItem, IdRange, RawCraft } from './types'
import { POWDER_TIERS, SKP_ELEMENTS } from '../data/powder-constants'
import { POWDER_STATS } from '../math/powder-stats'
import { resolveCraft } from './resolve'

// ---------------------------------------------------------------------------
// computeCraft — pure crafting math. Mirrors WB `craft.js#initCraftStats`.
//
// Task 5 scope: recipe expansion, mat-tier scaling, identification + req
// aggregation. Effectiveness is stubbed at 100% (Task 6 will replace
// `computeEffectiveness` with the real 3×2 matrix); the actual aggregation
// lives in `computeCraftWithEffectiveness` so tests can inject non-100%
// arrays. Powders are passed through but not applied (Task 7).
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
 * The recipe adapter guarantees every recipe carries exactly two materials,
 * each with a positive `amount`. Violating that contract is a bug in the
 * adapter (or hand-rolled fixture), not something we silently paper over.
 */
function computeMatMult(recipe: Recipe, matTiers: [1 | 2 | 3, 1 | 2 | 3]): number {
  const mats = recipe.materials
  if (!mats || mats.length !== 2) {
    throw new Error(
      `computeCraft: recipe ${recipe.id} (${recipe.name}) must have exactly 2 materials, got ${mats?.length ?? 0}`,
    )
  }
  const a1 = mats[0]?.amount
  const a2 = mats[1]?.amount
  if (typeof a1 !== 'number' || typeof a2 !== 'number') {
    throw new TypeError(
      `computeCraft: recipe ${recipe.id} (${recipe.name}) has materials with missing amount`,
    )
  }
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
 * ingredient slot). Ports the position-modifier accumulator from craft.js
 * lines 407–455.
 *
 * Slot layout: slot n → row i = floor(n/2), col j = n % 2. Each filled slot
 * contributes its non-zero posMods to other cells:
 *   - above:       all rows k < i in column j
 *   - under:       all rows k > i in column j
 *   - left:        only at col 1 → (i, 0)
 *   - right:       only at col 0 → (i, 1)
 *   - touching:    4-adjacent cells (no diagonals, excludes self)
 *   - notTouching: all non-touching cells (excludes self AND 4-neighbors)
 */
export function computeEffectiveness(ingredients: (Ingredient | null)[]): number[] {
  const eff: number[][] = [
    [100, 100],
    [100, 100],
    [100, 100],
  ]
  for (let n = 0; n < ingredients.length; n++) {
    const ing = ingredients[n]
    if (!ing)
      continue
    const i = Math.floor(n / 2)
    const j = n % 2
    const pm = ing.posMods
    // `above`
    if (pm.above) {
      for (let k = i - 1; k >= 0; k--)
        eff[k][j] += pm.above
    }
    // `under`
    if (pm.under) {
      for (let k = i + 1; k < 3; k++)
        eff[k][j] += pm.under
    }
    // `left` — only meaningful when source sits in col 1
    if (pm.left && j === 1)
      eff[i][0] += pm.left
    // `right` — only meaningful when source sits in col 0
    if (pm.right && j === 0)
      eff[i][1] += pm.right
    // `touching` — 4-adjacent cells
    if (pm.touching) {
      for (let k = 0; k < 3; k++) {
        for (let l = 0; l < 2; l++) {
          const di = Math.abs(k - i)
          const dj = Math.abs(l - j)
          if ((di === 1 && dj === 0) || (di === 0 && dj === 1))
            eff[k][l] += pm.touching
        }
      }
    }
    // `notTouching` — strictly more than one step away (excludes self & 4-neighbors)
    if (pm.notTouching) {
      for (let k = 0; k < 3; k++) {
        for (let l = 0; l < 2; l++) {
          const di = Math.abs(k - i)
          const dj = Math.abs(l - j)
          if (di > 1 || (di === 1 && dj === 1))
            eff[k][l] += pm.notTouching
        }
      }
    }
  }
  return [eff[0][0], eff[0][1], eff[1][0], eff[1][1], eff[2][0], eff[2][1]]
}

/**
 * For hover hints: given an ingredient and the slot it would be placed in,
 * return the set of slot indices (0..5) that its position modifiers would
 * affect. Mirrors the per-modifier branches in `computeEffectiveness` but
 * accumulates affected cells instead of effectiveness values. Modifiers with
 * a zero value are ignored. The source slot itself is never included.
 */
export function computeAffectedCells(ing: Ingredient, fromSlotIndex: number): Set<number> {
  const out = new Set<number>()
  if (fromSlotIndex < 0 || fromSlotIndex > 5)
    return out
  const i = Math.floor(fromSlotIndex / 2)
  const j = fromSlotIndex % 2
  const pm = ing.posMods
  const idx = (k: number, l: number) => k * 2 + l

  if (pm.above) {
    for (let k = i - 1; k >= 0; k--)
      out.add(idx(k, j))
  }
  if (pm.under) {
    for (let k = i + 1; k < 3; k++)
      out.add(idx(k, j))
  }
  if (pm.left && j === 1)
    out.add(idx(i, 0))
  if (pm.right && j === 0)
    out.add(idx(i, 1))
  if (pm.touching) {
    for (let k = 0; k < 3; k++) {
      for (let l = 0; l < 2; l++) {
        const di = Math.abs(k - i)
        const dj = Math.abs(l - j)
        if ((di === 1 && dj === 0) || (di === 0 && dj === 1))
          out.add(idx(k, l))
      }
    }
  }
  if (pm.notTouching) {
    for (let k = 0; k < 3; k++) {
      for (let l = 0; l < 2; l++) {
        const di = Math.abs(k - i)
        const dj = Math.abs(l - j)
        if (di > 1 || (di === 1 && dj === 1))
          out.add(idx(k, l))
      }
    }
  }
  out.delete(fromSlotIndex)
  return out
}

export function computeCraft(raw: RawCraft, ctx: CraftContext): CraftedItem {
  const { recipe, ingredients } = resolveCraft(raw, ctx)
  const eff = computeEffectiveness(ingredients)
  return computeCraftWithEffectiveness(raw, recipe, ingredients, eff)
}

/**
 * Internal: same as `computeCraft` but accepts an explicit 6-element
 * effectiveness array. Exported for tests so they can exercise non-100%
 * effectiveness before Task 6 replaces `computeEffectiveness` with the real
 * 3×2 matrix. Production code should call `computeCraft`.
 */
export function computeCraftWithEffectiveness(
  raw: RawCraft,
  recipe: Recipe,
  ingredients: (Ingredient | null)[],
  eff: number[],
): CraftedItem {
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
    // craft.js line 464: `eff_mult = (eff[n] / 100).toFixed(2)`. The result is
    // a string that JS coerces to a number on arithmetic. We replicate by
    // parsing back to a float so downstream Math.floor/Math.round see the
    // exact same value craft.js would.
    const effMult = Number.parseFloat((eff[n] / 100).toFixed(2))

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
          reqs[skp] += Math.round(v * effMult)
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

  // ---------- 7. Powders (Task 7) ----------
  applyPowders(item)

  return item
}

/**
 * Port of craft.js `Craft.applyPowders` (L202-214).
 *
 * Behavior (armor only):
 *   for each powder id in item.powders:
 *     elementIdx = floor(id / POWDER_TIERS)
 *     name       = SKP_ELEMENTS[elementIdx]
 *     prevName   = SKP_ELEMENTS[(elementIdx + 4) % 5]
 *     item[name+'Def']     += 2 * powder.defPlus    // double-apply
 *     item[prevName+'Def'] -= 2 * powder.defMinus   // double-apply
 *
 * Weapon powders: NOT applied here — damage from weapon powders is computed
 * downstream in `lib/math/dps`. We still leave `item.powders` populated.
 *
 * Consumables: powders are not applicable (no defenses, no damage).
 *
 * NOTE — craft.js paren bug (reproduced for parity): L203 reads
 *   `if (this.statMap.get("category") === "armor" || this.statMap.get("category" === "accessory"))`
 * The second operand is the JS expression `"category" === "accessory"` which
 * evaluates to `false`, so `statMap.get(false)` returns `undefined` and the
 * branch never matches for accessories. Result: in WB, only ARMOR gets the
 * double-apply. We mirror that exact behavior — accessories pass through.
 */
function applyPowders(item: CraftedItem): void {
  if (item.category !== 'armor')
    return
  if (item.powders.length === 0)
    return

  const defenses: Record<string, number> = { ...(item.defenses ?? {}) }
  for (const id of item.powders) {
    const powder = POWDER_STATS[id]
    if (!powder)
      continue // out-of-range powder id — ignore (matches WB undefined access)
    const elementIdx = Math.floor(id / POWDER_TIERS)
    const name = SKP_ELEMENTS[elementIdx]!
    const prevName = SKP_ELEMENTS[(elementIdx + 4) % 5]!
    defenses[`${name}Def`] = (defenses[`${name}Def`] ?? 0) + 2 * powder.defPlus
    defenses[`${prevName}Def`] = (defenses[`${prevName}Def`] ?? 0) - 2 * powder.defMinus
  }
  item.defenses = defenses
}
