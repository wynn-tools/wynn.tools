import type { Ingredient } from '../data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '../data/cdn-adapter/recipe-adapter'
import type { CraftContext, RawCraft } from './types'
import { describe, expect, it } from 'vitest'
import { computeCraft } from './compute-craft'

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
})
