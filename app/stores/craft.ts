import type { EncodingConstants } from '~/lib/codec/encoding-constants'
import type { AtkSpeed, CraftContext, CraftedItem, RawCraft } from '~/lib/crafter/types'
import type { Recipe } from '~/lib/data/cdn-adapter/recipe-adapter'
import type { CdnClient } from '~/lib/data/cdn-client'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { loadBuildContext, resolveLatestVersionId } from '~/composables/useBuildData'
import { BitVector, BitVectorCursor } from '~/lib/codec/bit-vector'
import { CraftCodecError, decodeCraft, encodeCraft } from '~/lib/codec/craft-codec'
import { computeCraft } from '~/lib/crafter/compute-craft'

const WEAPON_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])

export function defaultRawCraft(): RawCraft {
  return {
    recipeId: 0,
    ingredientIds: [null, null, null, null, null, null],
    matTiers: [1, 1],
    atkSpdOverride: null,
    powders: [],
  }
}

function firstRecipeId(ctx: CraftContext): number {
  // Map preserves insertion order; the recipes map is populated from the
  // adapter in CDN order, which is stable enough for "first recipe".
  const next = ctx.recipes.keys().next()
  return next.done ? 0 : next.value
}

function recipeIsWeapon(ctx: CraftContext, id: number): boolean {
  const rec = ctx.recipes.get(id)
  return rec ? WEAPON_TYPES.has(rec.type) : false
}

export const useCraftStore = defineStore('craft', () => {
  // ----- state -----
  const raw = ref<RawCraft>(defaultRawCraft())
  const ctx = shallowRef<CraftContext | null>(null)
  const enc = shallowRef<EncodingConstants | null>(null)
  const versionId = ref<number>(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ----- getters -----
  const recipe = computed<Recipe | null>(() => {
    if (!ctx.value)
      return null
    return ctx.value.recipes.get(raw.value.recipeId) ?? null
  })

  const isWeapon = computed<boolean>(() => {
    const r = recipe.value
    return r ? WEAPON_TYPES.has(r.type) : false
  })

  const crafted = computed<CraftedItem | null>(() => {
    if (!ctx.value)
      return null
    // Unknown recipe id (e.g., before ctx loaded, or stale id) — return null.
    if (!ctx.value.recipes.has(raw.value.recipeId))
      return null
    try {
      return computeCraft(raw.value, ctx.value)
    }
    catch {
      return null
    }
  })

  const shareHash = computed<string>(() => {
    if (!enc.value || !ctx.value)
      return ''
    const isWep = recipeIsWeapon(ctx.value, raw.value.recipeId)
    const vec = encodeCraft(raw.value, enc.value, isWep)
    return vec.toB64()
  })

  // ----- actions -----
  function applyContext(loaded: { ctx: CraftContext, enc: EncodingConstants, versionId: number }) {
    ctx.value = loaded.ctx
    enc.value = loaded.enc
    versionId.value = loaded.versionId
  }

  async function loadFresh(versionIdInput: number, client: CdnClient): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // Resolve the snapshot. Reuse loadBuildContext to also fetch encoding consts.
      const resolved = versionIdInput < 0 ? await resolveLatestVersionId(client) : versionIdInput
      const built = await loadBuildContext(client, resolved)
      const craftCtx: CraftContext = built.ctx.craftContext ?? { ingredients: new Map(), recipes: new Map() }
      applyContext({ ctx: craftCtx, enc: built.enc, versionId: resolved })

      // Reset raw to defaults, pinning to the first recipe.
      const next = defaultRawCraft()
      next.recipeId = firstRecipeId(craftCtx)
      raw.value = next
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      ctx.value = null
      enc.value = null
    }
    finally {
      loading.value = false
    }
  }

  async function loadFromHash(hashInput: string, client: CdnClient): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // We don't have an embedded versionId in the craft hash format; load latest
      // and use it as the canonical context. (Crafter hashes are intended to be
      // produced/consumed on the same version; cross-version validation is the
      // caller's job.)
      const resolved = await resolveLatestVersionId(client)
      const built = await loadBuildContext(client, resolved)
      const craftCtx: CraftContext = built.ctx.craftContext ?? { ingredients: new Map(), recipes: new Map() }

      const vec = new BitVector(hashInput, hashInput.length * 6)
      const cursor = new BitVectorCursor(vec)
      const decoded = decodeCraft(cursor, id => recipeIsWeapon(craftCtx, id))

      if (!craftCtx.recipes.has(decoded.recipeId)) {
        throw new CraftCodecError(`Unknown recipe id ${decoded.recipeId}`)
      }

      applyContext({ ctx: craftCtx, enc: built.enc, versionId: resolved })
      raw.value = decoded
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
    finally {
      loading.value = false
    }
  }

  function setRecipe(id: number): void {
    // Mutate immutably and reset weapon-only fields when leaving weapon territory.
    const newRaw: RawCraft = { ...raw.value, recipeId: id }
    const isWep = ctx.value ? recipeIsWeapon(ctx.value, id) : false
    if (!isWep)
      newRaw.atkSpdOverride = null
    raw.value = newRaw
  }

  function setIngredient(slot: number, id: number | null): void {
    if (slot < 0 || slot >= raw.value.ingredientIds.length)
      return
    const ingredientIds = raw.value.ingredientIds.slice()
    ingredientIds[slot] = id
    raw.value = { ...raw.value, ingredientIds }
  }

  function setMatTier(matSlot: 0 | 1, tier: 1 | 2 | 3): void {
    const matTiers: [1 | 2 | 3, 1 | 2 | 3] = [raw.value.matTiers[0], raw.value.matTiers[1]]
    matTiers[matSlot] = tier
    raw.value = { ...raw.value, matTiers }
  }

  function setAtkSpdOverride(spd: AtkSpeed | null): void {
    if (!isWeapon.value) {
      // Non-weapon: ensure override stays null.
      if (raw.value.atkSpdOverride !== null)
        raw.value = { ...raw.value, atkSpdOverride: null }
      return
    }
    raw.value = { ...raw.value, atkSpdOverride: spd }
  }

  function setPowders(powders: number[]): void {
    raw.value = { ...raw.value, powders: powders.slice() }
  }

  function reset(): void {
    const next = defaultRawCraft()
    if (ctx.value)
      next.recipeId = firstRecipeId(ctx.value)
    raw.value = next
  }

  // Seed the crafter with a RawCraft that came from elsewhere (typically a
  // build's crafted equipment slot). Ensures the craft context is loaded so
  // the resulting recipe / ingredients resolve; the input is deep-cloned so
  // later edits in the crafter don't mutate the source.
  async function prefillFromRaw(rawInput: RawCraft, client: CdnClient): Promise<void> {
    if (!ctx.value && !loading.value) {
      const resolved = await resolveLatestVersionId(client)
      const built = await loadBuildContext(client, resolved)
      const craftCtx: CraftContext = built.ctx.craftContext ?? { ingredients: new Map(), recipes: new Map() }
      applyContext({ ctx: craftCtx, enc: built.enc, versionId: resolved })
    }
    raw.value = JSON.parse(JSON.stringify(rawInput)) as RawCraft
  }

  return {
    // state
    raw,
    ctx,
    enc,
    versionId,
    loading,
    error,
    // getters
    crafted,
    recipe,
    isWeapon,
    shareHash,
    // actions
    loadFresh,
    loadFromHash,
    setRecipe,
    setIngredient,
    setMatTier,
    setAtkSpdOverride,
    setPowders,
    reset,
    prefillFromRaw,
  }
})
