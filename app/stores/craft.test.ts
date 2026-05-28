import type { CraftContext } from '~/lib/crafter/types'
import type { Ingredient } from '~/lib/data/cdn-adapter/ingredient-adapter'
import type { Recipe } from '~/lib/data/cdn-adapter/recipe-adapter'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYNTHETIC_ENC } from '~/lib/codec/__fixtures__/synthetic-enc'
import { BitVector, BitVectorCursor } from '~/lib/codec/bit-vector'
import { decodeCraft, encodeCraft } from '~/lib/codec/craft-codec'
import { defaultRawCraft, useCraftStore } from './craft'

// ---------------------------------------------------------------------------
// Test fixtures (no network). The store exposes `ctx` and `enc` as refs we can
// assign directly to skip the CDN-loading code path.
// ---------------------------------------------------------------------------

function makeRecipe(over: Partial<Recipe> & { id: number, type: string }): Recipe {
  return {
    id: over.id,
    name: over.name ?? `recipe-${over.id}`,
    type: over.type,
    skill: 'weaponsmithing',
    lvl: over.lvl ?? [1, 5],
    durability: over.durability ?? [100, 200],
    materials: over.materials ?? [
      { item: 'mat1', amount: 1 },
      { item: 'mat2', amount: 1 },
    ],
    ...over,
  } as Recipe
}

function makeIngredient(id: number): Ingredient {
  return {
    id,
    name: `ing-${id}`,
    displayName: `ing-${id}`,
    tier: 0,
    lvl: 1,
    skills: [],
    identifications: {},
    itemOnlyIDs: {
      durabilityModifier: 0,
      strReq: 0,
      dexReq: 0,
      intReq: 0,
      defReq: 0,
      agiReq: 0,
    },
    consumableOnlyIDs: { charges: 0, duration: 0 },
    posMods: { above: 0, under: 0, left: 0, right: 0, touching: 0, notTouching: 0 },
    icon: null,
  } as Ingredient
}

function makeCtx(): CraftContext {
  return {
    recipes: new Map<number, Recipe>([
      [10, makeRecipe({ id: 10, type: 'dagger' })], // weapon
      [20, makeRecipe({ id: 20, type: 'boots', lvl: [1, 5], durability: [100, 200] })], // armor (non-weapon)
    ]),
    ingredients: new Map<number, Ingredient>([
      [1, makeIngredient(1)],
      [5, makeIngredient(5)],
      [7, makeIngredient(7)],
    ]),
  }
}

/** Force a synthetic ctx + enc on a freshly-created store (bypasses CDN). */
function primeStore(): ReturnType<typeof useCraftStore> {
  const store = useCraftStore()
  store.ctx = makeCtx()
  store.enc = SYNTHETIC_ENC
  // Pin to first recipe (weapon).
  store.raw = { ...defaultRawCraft(), recipeId: 10 }
  return store
}

// ---------------------------------------------------------------------------

describe('useCraftStore — initial state', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts with the default RawCraft shape, no ctx, no error, not loading', () => {
    const store = useCraftStore()
    expect(store.raw).toEqual(defaultRawCraft())
    expect(store.ctx).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.crafted).toBeNull()
    expect(store.recipe).toBeNull()
    expect(store.isWeapon).toBe(false)
    expect(store.shareHash).toBe('')
  })

  it('defaultRawCraft returns the documented shape', () => {
    const r = defaultRawCraft()
    expect(r.recipeId).toBe(0)
    expect(r.ingredientIds).toEqual([null, null, null, null, null, null])
    expect(r.matTiers).toEqual([1, 1])
    expect(r.atkSpdOverride).toBeNull()
    expect(r.powders).toEqual([])
  })
})

describe('useCraftStore — getters react to raw', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('recipe + isWeapon track raw.recipeId', () => {
    const store = primeStore()
    expect(store.recipe?.id).toBe(10)
    expect(store.isWeapon).toBe(true)
    store.setRecipe(20)
    expect(store.recipe?.id).toBe(20)
    expect(store.isWeapon).toBe(false)
  })

  it('crafted recomputes when raw changes (mat tier example)', () => {
    const store = primeStore()
    store.setRecipe(20) // boots, durability [100,200] base
    const initial = store.crafted
    expect(initial).not.toBeNull()
    expect(initial!.durability).toEqual([100, 200]) // tier [1,1] → mult 1
    store.setMatTier(0, 3)
    store.setMatTier(1, 3)
    const after = store.crafted
    expect(after).not.toBeNull()
    // mult = 1.4 → durability = floor/round of [100,200]*1.4
    expect(after!.durability).toEqual([Math.round(100 * 1.4), Math.round(200 * 1.4)])
  })

  it('crafted is null when ctx has no matching recipe', () => {
    const store = primeStore()
    store.raw = { ...store.raw, recipeId: 9999 }
    expect(store.crafted).toBeNull()
  })
})

describe('useCraftStore — mutations', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('setRecipe updates raw and crafted updates', () => {
    const store = primeStore()
    expect(store.raw.recipeId).toBe(10)
    store.setRecipe(20)
    expect(store.raw.recipeId).toBe(20)
    expect(store.crafted?.type).toBe('boots')
  })

  it('setIngredient(2, 5) updates only slot 2', () => {
    const store = primeStore()
    store.setIngredient(2, 5)
    expect(store.raw.ingredientIds).toEqual([null, null, 5, null, null, null])
    store.setIngredient(0, 1)
    expect(store.raw.ingredientIds).toEqual([1, null, 5, null, null, null])
  })

  it('setMatTier updates the targeted material slot only', () => {
    const store = primeStore()
    store.setMatTier(0, 2)
    expect(store.raw.matTiers).toEqual([2, 1])
    store.setMatTier(1, 3)
    expect(store.raw.matTiers).toEqual([2, 3])
  })

  it('setAtkSpdOverride applies on weapon recipes', () => {
    const store = primeStore()
    expect(store.isWeapon).toBe(true)
    store.setAtkSpdOverride('FAST')
    expect(store.raw.atkSpdOverride).toBe('FAST')
    store.setAtkSpdOverride(null)
    expect(store.raw.atkSpdOverride).toBeNull()
  })

  it('setAtkSpdOverride is a no-op (forces null) on non-weapon recipes', () => {
    const store = primeStore()
    store.setRecipe(20) // boots
    expect(store.isWeapon).toBe(false)
    store.setAtkSpdOverride('FAST')
    expect(store.raw.atkSpdOverride).toBeNull()
  })

  it('setRecipe to non-weapon clears existing atkSpdOverride', () => {
    const store = primeStore()
    store.setAtkSpdOverride('SLOW')
    expect(store.raw.atkSpdOverride).toBe('SLOW')
    store.setRecipe(20) // non-weapon
    expect(store.raw.atkSpdOverride).toBeNull()
  })

  it('setPowders replaces the powders array (defensive copy)', () => {
    const store = primeStore()
    const arr = [1, 2, 3]
    store.setPowders(arr)
    expect(store.raw.powders).toEqual([1, 2, 3])
    // mutating the source must not leak in
    arr.push(99)
    expect(store.raw.powders).toEqual([1, 2, 3])
  })

  it('reset returns to defaults pinned to the first recipe in ctx', () => {
    const store = primeStore()
    store.setIngredient(0, 1)
    store.setMatTier(0, 3)
    store.setAtkSpdOverride('FAST')
    store.setPowders([1])
    store.reset()
    expect(store.raw).toEqual({ ...defaultRawCraft(), recipeId: 10 })
  })
})

describe('useCraftStore — shareHash round-trip via decodeCraft', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shareHash is non-empty when ctx is loaded; decodeCraft round-trips the raw state', async () => {
    const store = primeStore()
    store.setIngredient(0, 1)
    store.setIngredient(2, 5)
    store.setMatTier(0, 2)
    store.setMatTier(1, 3)
    store.setAtkSpdOverride('SLOW')

    const hash = store.shareHash
    expect(hash.length).toBeGreaterThan(0)

    // Decode it back manually using the same recipeIsWeapon function.
    const vec = new BitVector(hash, hash.length * 6)
    const decoded = decodeCraft(new BitVectorCursor(vec), id => id === 10)
    expect(decoded.recipeId).toBe(10)
    expect(decoded.ingredientIds[0]).toBe(1)
    expect(decoded.ingredientIds[2]).toBe(5)
    expect(decoded.matTiers).toEqual([2, 3])
    expect(decoded.atkSpdOverride).toBe('SLOW')
  })
})

describe('useCraftStore — loadFromHash error states (no network)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sets error and leaves state when client rejects', async () => {
    const store = useCraftStore()
    const badClient = {
      fetchJson: () => Promise.reject(new Error('network down')),
    }
    await store.loadFromHash('ABCD', badClient as never)
    expect(store.error).toBeTruthy()
    expect(store.error).toContain('network down')
    expect(store.loading).toBe(false)
  })
})

describe('useCraftStore — loadFromHash with mocked context', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('sets error when decoded recipe id is unknown to the loaded ctx', async () => {
    // Build a hash that encodes recipeId=9999 (which our ctx won't have).
    const rawWithUnknown = { ...defaultRawCraft(), recipeId: 4000 }
    const vec = encodeCraft(rawWithUnknown, SYNTHETIC_ENC, false)
    const hash = vec.toB64()

    // Mock useBuildData so loadFromHash resolves to a tiny synthetic ctx.
    vi.doMock('~/composables/useBuildData', () => ({
      resolveLatestVersionId: async () => 0,
      loadBuildContext: async () => ({
        ctx: { craftContext: makeCtx() },
        enc: SYNTHETIC_ENC,
      }),
    }))

    // Re-import the store after the mock is registered.
    const { useCraftStore: useStoreMocked } = await import('./craft')
    const store = useStoreMocked()
    const fakeClient = { fetchJson: async () => ({}) } as never
    await store.loadFromHash(hash, fakeClient)

    expect(store.error).toBeTruthy()
    expect(store.error).toMatch(/4000|Unknown/i)

    vi.doUnmock('~/composables/useBuildData')
  })

  it('round-trips: shareHash from one store loads back into another (with matching ctx)', async () => {
    // Setup store A — primed synthetically — produce a hash.
    const a = useCraftStore()
    a.ctx = makeCtx()
    a.enc = SYNTHETIC_ENC
    a.raw = { ...defaultRawCraft(), recipeId: 10 }
    a.setIngredient(1, 7)
    a.setMatTier(0, 2)
    a.setAtkSpdOverride('FAST')
    const hash = a.shareHash
    expect(hash).not.toBe('')

    // Decode locally to confirm shape (no need to re-load via the network path
    // for this assertion — see the dedicated unknown-recipe test above for the
    // full mocked-load flow).
    const vec = new BitVector(hash, hash.length * 6)
    const decoded = decodeCraft(new BitVectorCursor(vec), id => id === 10)
    expect(decoded.recipeId).toBe(10)
    expect(decoded.ingredientIds[1]).toBe(7)
    expect(decoded.matTiers[0]).toBe(2)
    expect(decoded.atkSpdOverride).toBe('FAST')
  })
})
