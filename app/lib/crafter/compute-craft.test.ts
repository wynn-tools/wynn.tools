import type { Ingredient } from '../data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '../data/cdn-adapter/recipe-adapter'
import type { CraftContext, RawCraft } from './types'
import { describe, expect, it } from 'vitest'
import { computeCraft, computeCraftWithEffectiveness, computeEffectiveness } from './compute-craft'
import { resolveCraft } from './resolve'

// ---------------------------------------------------------------------------
// Fixture helpers. The shapes mirror what `adaptRecipes` / `adaptIngredients`
// would produce. We avoid loading real CDN data so the test can hand-verify
// the math step by step.
// ---------------------------------------------------------------------------

function makeIngredient(over: Partial<Ingredient> & { id: number }): Ingredient {
  return {
    id: over.id,
    name: over.name ?? `ing-${over.id}`,
    displayName: over.displayName ?? `ing-${over.id}`,
    tier: over.tier ?? 0,
    lvl: over.lvl ?? 1,
    skills: over.skills ?? [],
    identifications: over.identifications ?? {},
    itemOnlyIDs: {
      durabilityModifier: 0,
      strReq: 0,
      dexReq: 0,
      intReq: 0,
      defReq: 0,
      agiReq: 0,
      ...(over.itemOnlyIDs ?? {}),
    },
    consumableOnlyIDs: {
      charges: 0,
      duration: 0,
      ...(over.consumableOnlyIDs ?? {}),
    },
    posMods: {
      above: 0,
      under: 0,
      left: 0,
      right: 0,
      touching: 0,
      notTouching: 0,
      ...(over.posMods ?? {}),
    },
    icon: null,
  }
}

describe('computeCraft — base math (Task 5)', () => {
  /**
   * Golden case (hand-derived from craft.js):
   *
   *   recipe: boots, lvl [3, 5], durability [100, 200], hp [10, 20]
   *           materials: amounts [1, 2]
   *   matTiers: [2, 2]
   *     matmult = (1.25*1 + 1.25*2) / (1+2) = 1.25
   *
   *   ingredient A @ slot 0:
   *     identifications: { mdPct: { min: 2, max: 6 } }
   *     itemOnlyIDs:     { durabilityModifier: -10, strReq: 5 }
   *
   *   ingredient B @ slot 2:
   *     identifications: { spd: { min: -5, max: -2 }, ls: { min: 3, max: 7 } }
   *     itemOnlyIDs:     { durabilityModifier: 20, strReq: -2, dexReq: 4 }
   *
   *   Effectiveness = 100% everywhere (Task 5 stub).
   *
   *   Expected outputs:
   *     durability  = [round(100*1.25) + (-10+20), round(200*1.25) + (-10+20)]
   *                  = [125 + 10, 250 + 10] = [135, 260]
   *     hp          = [floor(10*1.25), floor(20*1.25)]     = [12, 25]
   *     identifications:
   *       mdPct: { min: 2, max: 6 }
   *       spd:   { min: -5, max: -2 }  (sorted ascending)
   *       ls:    { min: 3, max: 7 }
   *     reqs:
   *       level: 5
   *       strReq: max(0, round(0 + 5) + round(0 + (-2)))  = max(0, 5 - 2) = 3
   *       dexReq: max(0, 0 + 4)                            = 4
   *       intReq/defReq/agiReq: 0
   *     slots: 1 (lvlLow 3 < 30)
   *     powders: [] (passthrough)
   *     charges/duration: undefined (armor)
   */
  it('aggregates ids, reqs, and mat-tier-scaled durability for a simple armor craft', () => {
    const recipe: Recipe = {
      id: 1,
      name: 'Boots3-5',
      type: 'boots',
      skill: 'tailoring',
      lvl: [3, 5],
      durability: [100, 200],
      hp: [10, 20],
      materials: [
        { item: 'mat1', amount: 1 },
        { item: 'mat2', amount: 2 },
      ],
    }

    const ingA = makeIngredient({
      id: 100,
      identifications: { mdPct: { min: 2, max: 6, raw: 2 } },
      itemOnlyIDs: {
        durabilityModifier: -10,
        strReq: 5,
        dexReq: 0,
        intReq: 0,
        defReq: 0,
        agiReq: 0,
      },
    })
    const ingB = makeIngredient({
      id: 200,
      identifications: {
        spd: { min: -5, max: -2, raw: -5 },
        ls: { min: 3, max: 7, raw: 3 },
      },
      itemOnlyIDs: {
        durabilityModifier: 20,
        strReq: -2,
        dexReq: 4,
        intReq: 0,
        defReq: 0,
        agiReq: 0,
      },
    })

    const ctx: CraftContext = {
      recipes: new Map([[1, recipe]]),
      ingredients: new Map([[100, ingA], [200, ingB]]),
    }

    const raw: RawCraft = {
      recipeId: 1,
      ingredientIds: [100, null, 200, null, null, null],
      matTiers: [2, 2],
      atkSpdOverride: null,
      powders: [],
    }

    const out = computeCraft(raw, ctx)

    expect(out.category).toBe('armor')
    expect(out.type).toBe('boots')
    expect(out.tier).toBe('Crafted')
    expect(out.lvlLow).toBe(3)
    expect(out.lvl).toBe(5)
    expect(out.hash).toBe('')
    expect(out.powders).toEqual([])

    expect(out.durability).toEqual([135, 260])
    expect(out.hp).toEqual([12, 25])
    expect(out.slots).toBe(1)

    expect(out.identifications).toEqual({
      mdPct: { min: 2, max: 6 },
      spd: { min: -5, max: -2 },
      ls: { min: 3, max: 7 },
    })

    expect(out.reqs).toEqual({
      level: 5,
      strReq: 3,
      dexReq: 4,
      intReq: 0,
      defReq: 0,
      agiReq: 0,
    })

    expect(out.charges).toBeUndefined()
    expect(out.duration).toBeUndefined()
    expect(out.atkSpd).toBeUndefined()
  })

  it('weapon: applies atk-spd override and computes lvl-based slots', () => {
    const recipe: Recipe = {
      id: 2,
      name: 'Dagger70-73',
      type: 'dagger',
      skill: 'weaponsmithing',
      lvl: [70, 73],
      durability: [400, 500],
      damage: [50, 80],
      materials: [
        { item: 'mat1', amount: 1 },
        { item: 'mat2', amount: 1 },
      ],
    }
    const ctx: CraftContext = {
      recipes: new Map([[2, recipe]]),
      ingredients: new Map(),
    }
    const raw: RawCraft = {
      recipeId: 2,
      ingredientIds: [null, null, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: 'FAST',
      powders: [],
    }
    const out = computeCraft(raw, ctx)
    expect(out.category).toBe('weapon')
    expect(out.atkSpd).toBe('FAST')
    // lvlLow=70 → slots=3
    expect(out.slots).toBe(3)
    // matmult = 1.0, no ingredients → durability unchanged.
    expect(out.durability).toEqual([400, 500])
    // hp/damage range mat-scaling for weapons is deferred (lives in lib/math/dps).
    // Locks down the "weapon damage range is not computed in compute-craft" decision.
    expect(out.damage).toBeUndefined()
    expect(out.reqs).toEqual({
      level: 73,
      strReq: 0,
      dexReq: 0,
      intReq: 0,
      defReq: 0,
      agiReq: 0,
    })
  })

  it('consumable: derives charges by lvlLow, mat-scales duration, and skips reqs', () => {
    const recipe: Recipe = {
      id: 3,
      name: 'Potion1-3',
      type: 'potion',
      skill: 'alchemism',
      lvl: [1, 3],
      duration: [60, 80],
      hp: [50, 70],
      materials: [
        { item: 'mat1', amount: 1 },
        { item: 'mat2', amount: 1 },
      ],
    }
    const ing = makeIngredient({
      id: 400,
      identifications: { mr: { min: 1, max: 1, raw: 1 } },
      itemOnlyIDs: {
        // Should NOT contribute to reqs since this is a consumable.
        durabilityModifier: 999,
        strReq: 50,
        dexReq: 0,
        intReq: 0,
        defReq: 0,
        agiReq: 0,
      },
      consumableOnlyIDs: { charges: 1, duration: -10 },
    })
    const ctx: CraftContext = {
      recipes: new Map([[3, recipe]]),
      ingredients: new Map([[400, ing]]),
    }
    const raw: RawCraft = {
      recipeId: 3,
      ingredientIds: [400, null, null, null, null, null],
      matTiers: [3, 3],
      atkSpdOverride: null,
      powders: [],
    }
    const out = computeCraft(raw, ctx)
    expect(out.category).toBe('consumable')
    // matmult = (1.4*1 + 1.4*1)/2 = 1.4
    // duration base: [round(60*1.4), round(80*1.4)] = [84, 112], +(-10) → [74, 102]
    expect(out.duration).toEqual([74, 102])
    // base charges (lvlLow=1 → 1) + ingredient.charges (1) = 2
    expect(out.charges).toBe(2)
    // No durability on consumables
    expect(out.durability).toBeUndefined()
    // No reqs on consumables — only level
    expect(out.reqs).toEqual({ level: 3 })
    // slots stays 0 for consumables
    expect(out.slots).toBe(0)
    expect(out.identifications).toEqual({ mr: { min: 1, max: 1 } })
  })

  /**
   * Accessory (ring): category dispatch + id aggregation; locks down
   * `slots === 0` (accessories never carry powder slots) and that durability /
   * duration / charges all stay undefined.
   */
  it('accessory: ring carries identifications, slots=0, no durability/duration', () => {
    const recipe: Recipe = {
      id: 4,
      name: 'Ring10-12',
      type: 'ring',
      skill: 'jeweling',
      lvl: [10, 12],
      durability: [0, 0],
      materials: [
        { item: 'mat1', amount: 1 },
        { item: 'mat2', amount: 1 },
      ],
    }
    const ing = makeIngredient({
      id: 500,
      identifications: { hpBonus: { min: 5, max: 10, raw: 5 } },
      itemOnlyIDs: {
        durabilityModifier: 0,
        strReq: 3,
        dexReq: 0,
        intReq: 0,
        defReq: 0,
        agiReq: 0,
      },
    })
    const ctx: CraftContext = {
      recipes: new Map([[4, recipe]]),
      ingredients: new Map([[500, ing]]),
    }
    const raw: RawCraft = {
      recipeId: 4,
      ingredientIds: [500, null, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }
    const out = computeCraft(raw, ctx)
    expect(out.category).toBe('accessory')
    expect(out.type).toBe('ring')
    expect(out.slots).toBe(0)
    // accessories carry a durability field today (compute-craft treats anything
    // non-consumable identically); the recipe has zero durability so it rolls
    // out to [0, 0]. Renderers ignore this field for accessories.
    expect(out.durability).toEqual([0, 0])
    expect(out.duration).toBeUndefined()
    expect(out.charges).toBeUndefined()
    expect(out.identifications).toEqual({ hpBonus: { min: 5, max: 10 } })
    expect(out.reqs).toEqual({
      level: 12,
      strReq: 3,
      dexReq: 0,
      intReq: 0,
      defReq: 0,
      agiReq: 0,
    })
  })

  /**
   * Locks the req-rounding contract: **each per-ingredient contribution is
   * rounded, then summed** (matches craft.js). The previous implementation
   * applied a running `Math.round(reqs + v * eff)` which, while numerically
   * equivalent under standard half-to-+∞ rounding for integer accumulators,
   * is the wrong shape and would diverge under alternative rounding modes
   * (banker's, truncation, etc).
   *
   * Synthetic injection via `computeCraftWithEffectiveness` lets us exercise
   * non-100% effectiveness before Task 6 wires the real matrix.
   *
   * Hand-derived (slot 0 eff=120, slot 2 eff=80):
   *   strReq: round(3 * 1.2) + round(5 * 0.8)
   *         = round(3.6)     + round(4.0)
   *         = 4              + 4              = 8
   *   dexReq: round(1 * 1.2) + round(-2 * 0.8)
   *         = round(1.2)     + round(-1.6)
   *         = 1              + -2             = -1 → max(0, -1) = 0
   *   intReq: round(5 * 1.2) + round(2 * 0.8)
   *         = round(6.0)     + round(1.6)
   *         = 6              + 2              = 8
   *   defReq: round(2 * 1.2) + round(2 * 0.8)
   *         = round(2.4)     + round(1.6)
   *         = 2              + 2              = 4
   *   agiReq: 0 (no contributions)
   *
   *   identifications mdPct (slot 0 only):
   *     min = floor(2 * 1.2) = floor(2.4) = 2
   *     max = floor(6 * 1.2) = floor(7.2) = 7
   *
   *   identifications spd (slot 2 only):
   *     floor(-5 * 0.8) = floor(-4.0) = -4
   *     floor(-2 * 0.8) = floor(-1.6) = -2
   *     sorted ascending → [-4, -2]
   */
  it('req rounding: rounds each per-ingredient contribution then sums (non-100% eff)', () => {
    const recipe: Recipe = {
      id: 10,
      name: 'Helmet50-55',
      type: 'helmet',
      skill: 'armouring',
      lvl: [50, 55],
      durability: [100, 100],
      hp: [50, 60],
      materials: [
        { item: 'mat1', amount: 1 },
        { item: 'mat2', amount: 1 },
      ],
    }
    const ingA = makeIngredient({
      id: 1000,
      identifications: { mdPct: { min: 2, max: 6, raw: 2 } },
      itemOnlyIDs: {
        durabilityModifier: 0,
        strReq: 3,
        dexReq: 1,
        intReq: 5,
        defReq: 2,
        agiReq: 0,
      },
    })
    const ingB = makeIngredient({
      id: 2000,
      identifications: { spd: { min: -5, max: -2, raw: -5 } },
      itemOnlyIDs: {
        durabilityModifier: 0,
        strReq: 5,
        dexReq: -2,
        intReq: 2,
        defReq: 2,
        agiReq: 0,
      },
    })
    const ctx: CraftContext = {
      recipes: new Map([[10, recipe]]),
      ingredients: new Map([[1000, ingA], [2000, ingB]]),
    }
    const raw: RawCraft = {
      recipeId: 10,
      ingredientIds: [1000, null, 2000, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }

    const { recipe: r, ingredients } = resolveCraft(raw, ctx)
    const eff = [120, 100, 80, 100, 100, 100]
    const out = computeCraftWithEffectiveness(raw, r, ingredients, eff)

    expect(out.reqs).toEqual({
      level: 55,
      strReq: 8,
      dexReq: 0,
      intReq: 8,
      defReq: 4,
      agiReq: 0,
    })
    expect(out.identifications).toEqual({
      mdPct: { min: 2, max: 7 },
      spd: { min: -4, max: -2 },
    })
  })

  // -------------------------------------------------------------------------
  // Task 6: position-modifier effectiveness matrix
  // -------------------------------------------------------------------------

  /**
   * Empty grid baseline — sanity check that `computeEffectiveness` returns
   * a flat [100×6] when no slots are filled.
   */
  it('computeEffectiveness: empty grid → flat 100s', () => {
    expect(computeEffectiveness([null, null, null, null, null, null])).toEqual([
      100,
      100,
      100,
      100,
      100,
      100,
    ])
  })

  /**
   * Touching modifier — hand-derived.
   *
   * Grid layout (row, col):
   *   slot 0 (0,0)  slot 1 (0,1)
   *   slot 2 (1,0)  slot 3 (1,1)
   *   slot 4 (2,0)  slot 5 (2,1)
   *
   * Ingredient A @ slot 0 (0,0), posMods.touching = +20.
   *   4-adjacent cells of (0,0) are (0,1) and (1,0) — i.e. slots 1 and 2.
   *   So eff += 20 at slots 1 and 2.
   *
   * Ingredient B @ slot 1 (0,1) — no posMods. Carries the test's ids/reqs.
   *
   *   eff = [100, 100+20, 100+20, 100, 100, 100]
   *       = [100, 120,    120,    100, 100, 100]
   *
   * B sits in slot 1 → effMult = parseFloat((120/100).toFixed(2)) = 1.2.
   *
   * B identifications: mdPct {min:2, max:6} →
   *   min = floor(2 * 1.2) = floor(2.4) = 2
   *   max = floor(6 * 1.2) = floor(7.2) = 7
   *
   * B itemOnlyIDs: strReq=4 → round(4 * 1.2) = round(4.8) = 5.
   */
  it('computeEffectiveness: touching modifier scales 4-adjacent ingredient cells', () => {
    const recipe: Recipe = {
      id: 20,
      name: 'Helmet50-55',
      type: 'helmet',
      skill: 'armouring',
      lvl: [50, 55],
      durability: [100, 100],
      hp: [50, 60],
      materials: [
        { item: 'mat1', amount: 1 },
        { item: 'mat2', amount: 1 },
      ],
    }
    const ingA = makeIngredient({
      id: 3000,
      // No ids / reqs — A only contributes a posMod.
      posMods: { above: 0, under: 0, left: 0, right: 0, touching: 20, notTouching: 0 },
    })
    const ingB = makeIngredient({
      id: 3001,
      identifications: { mdPct: { min: 2, max: 6, raw: 2 } },
      itemOnlyIDs: {
        durabilityModifier: 0,
        strReq: 4,
        dexReq: 0,
        intReq: 0,
        defReq: 0,
        agiReq: 0,
      },
    })
    const ctx: CraftContext = {
      recipes: new Map([[20, recipe]]),
      ingredients: new Map([[3000, ingA], [3001, ingB]]),
    }
    const raw: RawCraft = {
      recipeId: 20,
      ingredientIds: [3000, 3001, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }

    // Verify the matrix shape directly.
    const { ingredients } = resolveCraft(raw, ctx)
    expect(computeEffectiveness(ingredients)).toEqual([100, 120, 120, 100, 100, 100])

    const out = computeCraft(raw, ctx)
    expect(out.identifications).toEqual({
      mdPct: { min: 2, max: 7 },
    })
    expect(out.reqs).toEqual({
      level: 55,
      strReq: 5,
      dexReq: 0,
      intReq: 0,
      defReq: 0,
      agiReq: 0,
    })
  })

  /**
   * `above` modifier — column-wise scaling, hand-derived.
   *
   * Ingredient A @ slot 4 (row 2, col 0), posMods.above = +30.
   *   `above` from (2,0) adds +30 to every row k<2 in column 0:
   *     eff[0][0] += 30  (slot 0)
   *     eff[1][0] += 30  (slot 2)
   *   No effect on column 1 (slots 1, 3, 5) or on slot 4 itself.
   *
   * Ingredient B @ slot 0 (0,0) — carries ids/reqs.
   *
   *   eff = [130, 100, 130, 100, 100, 100]
   *
   * B sits in slot 0 → effMult = parseFloat((130/100).toFixed(2)) = 1.3.
   *
   * B identifications: hpBonus {min:5, max:10} →
   *   min = floor(5 * 1.3)  = floor(6.5)  = 6
   *   max = floor(10 * 1.3) = floor(13.0) = 13
   *
   * B itemOnlyIDs: intReq=3 → round(3 * 1.3) = round(3.9) = 4.
   *
   * A sits in slot 4 (effMult = 1.0) and contributes no ids/reqs, so it has no
   * additional effect beyond the matrix it produces.
   */
  it('computeEffectiveness: above modifier scales upward in same column', () => {
    const recipe: Recipe = {
      id: 21,
      name: 'Chest40-45',
      type: 'chestplate',
      skill: 'armouring',
      lvl: [40, 45],
      durability: [100, 100],
      hp: [80, 100],
      materials: [
        { item: 'mat1', amount: 1 },
        { item: 'mat2', amount: 1 },
      ],
    }
    const ingA = makeIngredient({
      id: 4000,
      posMods: { above: 30, under: 0, left: 0, right: 0, touching: 0, notTouching: 0 },
    })
    const ingB = makeIngredient({
      id: 4001,
      identifications: { hpBonus: { min: 5, max: 10, raw: 5 } },
      itemOnlyIDs: {
        durabilityModifier: 0,
        strReq: 0,
        dexReq: 0,
        intReq: 3,
        defReq: 0,
        agiReq: 0,
      },
    })
    const ctx: CraftContext = {
      recipes: new Map([[21, recipe]]),
      ingredients: new Map([[4000, ingA], [4001, ingB]]),
    }
    const raw: RawCraft = {
      recipeId: 21,
      // B at slot 0 (top-left), A at slot 4 (bottom-left). A's `above` pushes
      // +30 up column 0 → boosts slot 0 (B) and slot 2.
      ingredientIds: [4001, null, null, null, 4000, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }

    const { ingredients } = resolveCraft(raw, ctx)
    expect(computeEffectiveness(ingredients)).toEqual([130, 100, 130, 100, 100, 100])

    const out = computeCraft(raw, ctx)
    expect(out.identifications).toEqual({
      hpBonus: { min: 6, max: 13 },
    })
    expect(out.reqs).toEqual({
      level: 45,
      strReq: 0,
      dexReq: 0,
      intReq: 4,
      defReq: 0,
      agiReq: 0,
    })
  })

  it('throws when recipe materials contract is violated (length != 2)', () => {
    const recipe = {
      id: 99,
      name: 'Bad',
      type: 'boots',
      skill: 'tailoring',
      lvl: [1, 1],
      durability: [10, 10],
      materials: [{ item: 'mat1', amount: 1 }],
    } as unknown as Recipe
    const ctx: CraftContext = {
      recipes: new Map([[99, recipe]]),
      ingredients: new Map(),
    }
    const raw: RawCraft = {
      recipeId: 99,
      ingredientIds: [null, null, null, null, null, null],
      matTiers: [1, 1],
      atkSpdOverride: null,
      powders: [],
    }
    expect(() => computeCraft(raw, ctx)).toThrow(/exactly 2 materials/)
  })
})
