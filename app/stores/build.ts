import type { BuildContext, BuildResult, RollContext, RollPreset } from '~/lib/build/compute-build'
import type { CleanedRawItem } from '~/lib/build/resolve'
import type { RawBuild } from '~/lib/codec/build-codec'
import type { EncodingConstants } from '~/lib/codec/encoding-constants'
import type { RawCraft } from '~/lib/crafter/types'
import type { CdnClient } from '~/lib/data/cdn-client'
import type { SearchItem } from '~/lib/items-search/types'
import type { BoostId, BuildBoosts } from '~/lib/math/boosts'
import type { ExpandedItem } from '~/lib/math/expand-item'
import type { PowderActive } from '~/lib/math/powder-specials'
import type { Aspect } from '~/lib/types/aspect'
import type { ResolvedImport } from '~/lib/wynntils/types'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { loadBuildContext, peekVersionId, resolveLatestVersion } from '~/composables/useBuildData'
import { useToast } from '~/composables/useToast'
import { getSortedClassAtree } from '~/lib/atree/build-atree'
import { unlockPathTo } from '~/lib/atree/pathfind'
import { validateAtree } from '~/lib/atree/validate'
import { computeBuild } from '~/lib/build/compute-build'
import { POWDER_INDEX_BY_SLOT, resolveBuildItems, resolveTomes } from '~/lib/build/resolve'
import { SLOT_LABELS } from '~/lib/build/slot-labels'
import { decodeRawBuild, encodeRawBuild, slotItemId } from '~/lib/codec/build-codec'
import { num } from '~/lib/codec/codec-util'
import { decodeRollOverrides, encodeRollOverrides } from '~/lib/codec/roll-overrides'
import { WEP_TO_CLASS } from '~/lib/codec/wep-to-class'
import { emptyBoosts } from '~/lib/math/boosts'
import { SKP_ORDER } from '~/lib/math/constants'
import { emptyPowderActive } from '~/lib/math/powder-specials'

const DEFAULT_LEVEL = 106

const SLOT_TYPES = ['helmet', 'chestplate', 'leggings', 'boots', 'ring', 'ring', 'bracelet', 'necklace'] as const

const WEAPON_RECIPE_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])

function makeRecipeIsWeapon(ctx: BuildContext): (recipeId: number) => boolean {
  const recipes = ctx.craftContext?.recipes
  if (!recipes)
    return () => false
  return (recipeId: number) => {
    const rec = recipes.get(recipeId)
    return rec ? WEAPON_RECIPE_TYPES.has(rec.type) : false
  }
}

export const TOME_SLOT_TYPES: Record<number, string> = {
  0: 'weaponTome',
  1: 'weaponTome',
  2: 'armorTome',
  3: 'armorTome',
  4: 'armorTome',
  5: 'armorTome',
  6: 'guildTome',
  7: 'lootrunTome',
  8: 'gatherXpTome',
  9: 'gatherXpTome',
  10: 'dungeonXpTome',
  11: 'dungeonXpTome',
  12: 'mobXpTome',
  13: 'mobXpTome',
}

const ROLL_PRESET_KEY = 'wynn.tools:rollPreset'

function loadPresetFromStorage(): RollPreset {
  if (typeof localStorage === 'undefined')
    return 'max'
  const v = localStorage.getItem(ROLL_PRESET_KEY)
  return v === 'min' || v === 'avg' || v === 'max' ? v : 'max'
}

export const useBuildStore = defineStore('build', () => {
  // --- Roll controls ---------------------------------------------------------
  // useRouter / useRoute are Nuxt auto-imports; they throw in the Vitest node
  // environment (no Vue app). Guard with try/catch so unit tests still work.
  // useToast is a plain Vue composable (ref + setTimeout) — safe everywhere.
  const { push: _pushToast } = useToast()
  let _router: ReturnType<typeof useRouter> | null = null
  let _route: ReturnType<typeof useRoute> | null = null
  try {
    _router = useRouter()
    _route = useRoute()
  }
  catch {
    // Vitest node env has no Nuxt app context — URL sync becomes a no-op there.
  }

  const rollPreset = ref<RollPreset>(loadPresetFromStorage())
  const itemRollOverrides = ref<Map<number, Map<string, number>>>(new Map())
  const tomeRollOverrides = ref<Map<number, Map<string, number>>>(new Map())

  function setRollPreset(p: RollPreset) {
    rollPreset.value = p
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(ROLL_PRESET_KEY, p)
  }

  // Write current override state back to the URL ?rolls= param.
  // Uses value comparison (_lastWritten) as a loop guard instead of a boolean
  // flag, which would deadlock when router.replace is a no-op (identical query).
  let _lastWritten: string | null = null

  function readOverridesFromQuery() {
    if (!_route)
      return
    const raw = _route.query.rolls
    const str = typeof raw === 'string' ? raw : ''
    if (str === (_lastWritten ?? ''))
      return // ignore our own writes
    const { itemOverrides, tomeOverrides } = decodeRollOverrides(str)
    itemRollOverrides.value = itemOverrides
    tomeRollOverrides.value = tomeOverrides
  }
  function writeOverridesToQuery() {
    if (!_router || !_route)
      return
    const encoded = encodeRollOverrides(itemRollOverrides.value, tomeRollOverrides.value)
    _lastWritten = encoded || null
    const query = { ..._route.query }
    if (encoded)
      query.rolls = encoded
    else
      delete query.rolls
    _router.replace({ query })
  }

  // Sync overrides from URL on init and on external navigation.
  readOverridesFromQuery()
  if (_route) {
    watch(() => _route!.query.rolls, readOverridesFromQuery)
  }

  // --- Override mutations ----------------------------------------------------
  function setOverride(slot: number, idName: string, raw: number) {
    const m = new Map(itemRollOverrides.value)
    const slotMap = new Map(m.get(slot) ?? [])
    slotMap.set(idName, raw)
    m.set(slot, slotMap)
    itemRollOverrides.value = m
    writeOverridesToQuery()
  }

  function clearOverride(slot: number, idName: string) {
    const m = new Map(itemRollOverrides.value)
    const slotMap = new Map(m.get(slot) ?? [])
    slotMap.delete(idName)
    if (slotMap.size === 0)
      m.delete(slot)
    else
      m.set(slot, slotMap)
    itemRollOverrides.value = m
    writeOverridesToQuery()
  }

  function clearSlotOverrides(slot: number): number {
    const existing = itemRollOverrides.value.get(slot)
    const count = existing?.size ?? 0
    if (count === 0)
      return 0
    const m = new Map(itemRollOverrides.value)
    m.delete(slot)
    itemRollOverrides.value = m
    writeOverridesToQuery()
    return count
  }

  function setTomeOverride(tomeSlot: number, idName: string, raw: number) {
    const m = new Map(tomeRollOverrides.value)
    const slotMap = new Map(m.get(tomeSlot) ?? [])
    slotMap.set(idName, raw)
    m.set(tomeSlot, slotMap)
    tomeRollOverrides.value = m
    writeOverridesToQuery()
  }

  function clearTomeOverride(tomeSlot: number, idName: string) {
    const m = new Map(tomeRollOverrides.value)
    const slotMap = new Map(m.get(tomeSlot) ?? [])
    slotMap.delete(idName)
    if (slotMap.size === 0)
      m.delete(tomeSlot)
    else
      m.set(tomeSlot, slotMap)
    tomeRollOverrides.value = m
    writeOverridesToQuery()
  }

  function clearTomeSlotOverrides(tomeSlot: number): number {
    const existing = tomeRollOverrides.value.get(tomeSlot)
    const count = existing?.size ?? 0
    if (count === 0)
      return 0
    const m = new Map(tomeRollOverrides.value)
    m.delete(tomeSlot)
    tomeRollOverrides.value = m
    writeOverridesToQuery()
    return count
  }

  function clearAllOverrides() {
    itemRollOverrides.value = new Map()
    tomeRollOverrides.value = new Map()
    writeOverridesToQuery()
  }

  const totalOverrideCount = computed(() => {
    let n = 0
    for (const m of itemRollOverrides.value.values())
      n += m.size
    for (const m of tomeRollOverrides.value.values())
      n += m.size
    return n
  })

  const itemsWithOverridesCount = computed(
    () => itemRollOverrides.value.size + tomeRollOverrides.value.size,
  )

  // ---------------------------------------------------------------------------
  const rawBuild = shallowRef<RawBuild | null>(null)
  const boosts = ref<BuildBoosts>(emptyBoosts())
  const powderActive = ref<PowderActive>(emptyPowderActive())
  const atreeMessage = ref<string | null>(null)
  const ctx = shallowRef<BuildContext | null>(null)
  const enc = shallowRef<EncodingConstants | null>(null)
  const weaponTypeFn = shallowRef<((id: number) => string | null) | null>(null)
  const searchItemById = shallowRef<Map<number, SearchItem> | null>(null)
  const loading = ref(false)
  const loadedVersionId = ref<number | null>(null)
  const latestVersionId = ref<number | null>(null)
  const loadedGameVersion = ref<string | null>(null)
  const latestGameVersion = ref<string | null>(null)
  const error = ref<string | null>(null)

  const isOldVersion = computed<boolean>(() =>
    loadedVersionId.value !== null
    && latestVersionId.value !== null
    && loadedVersionId.value < latestVersionId.value,
  )

  async function loadFromHash(hash: string, client: CdnClient) {
    loading.value = true
    error.value = null
    try {
      const versionId = peekVersionId(hash)
      const [loaded, latest] = await Promise.all([
        loadBuildContext(client, versionId),
        resolveLatestVersion(client),
      ])
      const raw = decodeRawBuild(hash, () => ({
        enc: loaded.enc,
        atreeData: loaded.ctx.atreeData,
        weaponType: loaded.weaponType,
        recipeIsWeapon: makeRecipeIsWeapon(loaded.ctx),
      }))
      ctx.value = loaded.ctx
      enc.value = loaded.enc
      weaponTypeFn.value = loaded.weaponType
      searchItemById.value = loaded.searchItemById
      rawBuild.value = raw
      loadedVersionId.value = versionId
      loadedGameVersion.value = loaded.gameVersion
      latestVersionId.value = latest.versionId
      latestGameVersion.value = latest.gameVersion
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      rawBuild.value = null
      ctx.value = null
      searchItemById.value = null
      loadedVersionId.value = null
      loadedGameVersion.value = null
      latestVersionId.value = null
      latestGameVersion.value = null
    }
    finally {
      loading.value = false
    }
  }

  /** Initialize a fresh, empty build on the latest version (no hash yet). */
  async function newBuild(client: CdnClient) {
    loading.value = true
    error.value = null
    try {
      const latest = await resolveLatestVersion(client)
      const loaded = await loadBuildContext(client, latest.versionId)
      const e = loaded.enc
      ctx.value = loaded.ctx
      enc.value = e
      weaponTypeFn.value = loaded.weaponType
      searchItemById.value = loaded.searchItemById
      atreeMessage.value = null
      loadedVersionId.value = latest.versionId
      loadedGameVersion.value = loaded.gameVersion
      latestVersionId.value = latest.versionId
      latestGameVersion.value = latest.gameVersion
      rawBuild.value = {
        versionId: latest.versionId,
        equipment: Array.from({ length: num(e, 'EQUIPMENT_NUM') }, () => ({ kind: 'normal' as const, id: null })),
        powders: Array.from({ length: POWDER_INDEX_BY_SLOT.size }, () => []),
        tomeIds: Array.from({ length: num(e, 'TOME_NUM') }).fill(null),
        sp: null,
        level: DEFAULT_LEVEL,
        aspects: Array.from({ length: num(e, 'NUM_ASPECTS') }).fill(null),
        activeAtree: [],
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      rawBuild.value = null
      ctx.value = null
      searchItemById.value = null
      loadedVersionId.value = null
      loadedGameVersion.value = null
      latestVersionId.value = null
      latestGameVersion.value = null
    }
    finally {
      loading.value = false
    }
  }

  async function upgradeBuild(client: CdnClient) {
    if (!rawBuild.value || latestVersionId.value === null)
      return
    loading.value = true
    error.value = null
    try {
      const newVersionId = latestVersionId.value
      const loaded = await loadBuildContext(client, newVersionId)
      const old = rawBuild.value

      const newEquipNum = num(loaded.enc, 'EQUIPMENT_NUM')
      const equipment = Array.from({ length: newEquipNum }, (_, i) => {
        const slot = old.equipment[i]
        // Crafted slots survive upgrades as-is (their recipe id is independent
        // of the item DB and remains valid across snapshots).
        if (slot?.kind === 'crafted')
          return slot
        const id = slot?.kind === 'normal' ? slot.id : null
        const kept = id != null && loaded.ctx.rawItemIndex.resolveId(id) !== null ? id : null
        return { kind: 'normal' as const, id: kept }
      })

      const newTomeNum = num(loaded.enc, 'TOME_NUM')
      const tomeIds = Array.from({ length: newTomeNum }, (_, i) => {
        const id = old.tomeIds[i] ?? null
        return id != null && loaded.ctx.tomeIndex.resolveId(id) !== null ? id : null
      }) as Array<number | null>

      const newAspectNum = num(loaded.enc, 'NUM_ASPECTS')
      const aspects = Array.from({ length: newAspectNum }).fill(null) as Array<null>

      ctx.value = loaded.ctx
      enc.value = loaded.enc
      weaponTypeFn.value = loaded.weaponType
      searchItemById.value = loaded.searchItemById
      loadedVersionId.value = newVersionId
      loadedGameVersion.value = loaded.gameVersion
      atreeMessage.value = null
      rawBuild.value = { ...old, versionId: newVersionId, equipment, tomeIds, aspects, activeAtree: [] }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
    finally {
      loading.value = false
    }
  }

  function setItem(slot: number, id: number | null) {
    if (!rawBuild.value)
      return
    const cleared = clearSlotOverrides(slot)
    if (cleared > 0)
      _pushToast('info', `Cleared ${cleared} custom roll${cleared === 1 ? '' : 's'} on ${SLOT_LABELS[slot] ?? 'slot'}`)
    const equipment = rawBuild.value.equipment.slice()
    equipment[slot] = { kind: 'normal', id }
    rawBuild.value = { ...rawBuild.value, equipment }
  }

  /**
   * Equip a crafted item into a build slot. `recipeIsWeapon` is derived from the
   * RawCraft's recipe (see `makeRecipeIsWeapon`); we expose it as a separate arg
   * so callers (typically the embedded crafter) can pass the value they already
   * have without re-resolving the recipe.
   */
  function setCraftedSlot(slot: number, raw: RawCraft, recipeIsWeapon: boolean) {
    if (!rawBuild.value)
      return
    const cleared = clearSlotOverrides(slot)
    if (cleared > 0)
      _pushToast('info', `Cleared ${cleared} custom roll${cleared === 1 ? '' : 's'} on ${SLOT_LABELS[slot] ?? 'slot'}`)
    const equipment = rawBuild.value.equipment.slice()
    equipment[slot] = { kind: 'crafted', raw, recipeIsWeapon }
    rawBuild.value = { ...rawBuild.value, equipment }
  }

  function applyImport(rows: ResolvedImport[]) {
    if (!rawBuild.value || rows.length === 0)
      return
    const equipment = rawBuild.value.equipment.slice()
    const powders = rawBuild.value.powders.map(p => p.slice())
    const overrides = new Map(itemRollOverrides.value)
    for (const row of rows) {
      equipment[row.slot] = { kind: 'normal' as const, id: row.itemId }
      overrides.delete(row.slot)
      if (row.overrides.size > 0)
        overrides.set(row.slot, new Map(row.overrides))
      const powderIdx = POWDER_INDEX_BY_SLOT.get(row.slot)
      if (powderIdx !== undefined) {
        const max = ctx.value ? Number(ctx.value.rawItemIndex.resolveId(row.itemId)?.slots) || 0 : 0
        powders[powderIdx] = row.powders.slice(0, max)
      }
    }
    rawBuild.value = { ...rawBuild.value, equipment, powders }
    itemRollOverrides.value = overrides
    writeOverridesToQuery()
  }

  function setLevel(level: number) {
    if (!rawBuild.value)
      return
    rawBuild.value = { ...rawBuild.value, level }
  }

  function currentWeaponType(): string | null {
    if (!rawBuild.value || !weaponTypeFn.value)
      return null
    const wid = slotItemId(rawBuild.value.equipment[8])
    return wid == null ? null : weaponTypeFn.value(wid)
  }

  const currentHash = computed<string | null>(() => {
    if (!rawBuild.value || !enc.value || !ctx.value)
      return null
    const wt = currentWeaponType()
    const cls = wt ? WEP_TO_CLASS[wt] : undefined
    const sortedTree = cls ? getSortedClassAtree(ctx.value.atreeData, cls) : []
    return encodeRawBuild(rawBuild.value, enc.value, sortedTree)
  })

  function itemsForSlot(slot: number): CleanedRawItem[] {
    if (!ctx.value)
      return []
    // Weapon slot: match by category so an empty slot still lists every weapon
    // (the specific type/class is only known once a weapon is equipped).
    const type = slot === 8 ? null : SLOT_TYPES[slot]
    if (slot !== 8 && !type)
      return []
    const out: CleanedRawItem[] = []
    for (const item of ctx.value.rawItemIndex.byId.values()) {
      if ((item.id as number) >= 10000)
        continue // NONE placeholders
      if (slot === 8 ? item.category === 'weapon' : item.type === type)
        out.push(item)
    }
    return out.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)))
  }

  function equipmentSearchItem(slot: number): SearchItem | null {
    const id = slotItemId(rawBuild.value?.equipment[slot])
    if (id == null || !searchItemById.value)
      return null
    return searchItemById.value.get(id) ?? null
  }

  function toggleBoost(id: BoostId) {
    const toggles = new Set(boosts.value.toggles)
    if (toggles.has(id))
      toggles.delete(id)
    else
      toggles.add(id)
    boosts.value = { ...boosts.value, toggles }
  }

  function setElemDmg(index: number, value: number) {
    const elemDmg = [...boosts.value.elemDmg] as BuildBoosts['elemDmg']
    elemDmg[index] = value
    boosts.value = { ...boosts.value, elemDmg }
  }

  function setBoosts(next: BuildBoosts) {
    boosts.value = next
  }

  function resetBoosts() {
    boosts.value = emptyBoosts()
  }

  function setPowderTier(index: number, tier: number) {
    const next = [...powderActive.value] as PowderActive
    next[index] = tier
    powderActive.value = next
  }

  function setPowderActive(next: PowderActive) {
    powderActive.value = next
  }

  function resetPowderActive() {
    powderActive.value = emptyPowderActive()
  }

  const rollContext = computed<RollContext>(() => ({
    preset: rollPreset.value,
    itemOverrides: itemRollOverrides.value,
    tomeOverrides: tomeRollOverrides.value,
  }))

  // TODO memoize: duplicates resolve work done inside computeBuild, acceptable for v1
  const resolvedEquipmentComputed = computed(() => {
    if (!rawBuild.value || !ctx.value)
      return null
    return resolveBuildItems(rawBuild.value, ctx.value.rawItemIndex, ctx.value.craftContext, rollContext.value)
  })

  function expandedAtSlot(slot: number): ExpandedItem | null {
    return resolvedEquipmentComputed.value?.allItems[slot] ?? null
  }

  // TODO memoize: duplicates resolve work done inside computeBuild, acceptable for v1.
  // COUPLING: this re-walk mirrors resolveTomes' skip predicate (null id, unresolvable id).
  // If resolveTomes ever changes its skip conditions, the slot correlation below will silently
  // diverge — fix by exposing a bySlot map directly from resolveTomes when that happens.
  const resolvedTomesComputed = computed(() => {
    if (!rawBuild.value || !ctx.value)
      return null
    // Build a Map<tomeSlot, ExpandedItem> keyed by the original slot index (not dense array offset).
    // resolveTomes returns a dense array of non-null tomes; we re-walk tomeIds to correlate
    // each dense element back to the slot it came from.
    const tomeIds = rawBuild.value.tomeIds
    const tomeIndex = ctx.value.tomeIndex
    const { tomes } = resolveTomes(tomeIds, tomeIndex, rollContext.value)
    const bySlot = new Map<number, ExpandedItem>()
    let denseIdx = 0
    for (let i = 0; i < tomeIds.length; i++) {
      const id = tomeIds[i]
      if (id === null || id === undefined)
        continue
      const cleaned = tomeIndex.resolveId(id)
      if (cleaned === null)
        continue
      const expanded = tomes[denseIdx]
      if (expanded)
        bySlot.set(i, expanded)
      denseIdx++
    }
    return bySlot
  })

  function expandedAtTomeSlot(slot: number): ExpandedItem | null {
    return resolvedTomesComputed.value?.get(slot) ?? null
  }

  const result = computed<BuildResult | null>(() => {
    if (!rawBuild.value || !ctx.value)
      return null
    return computeBuild(rawBuild.value, ctx.value, boosts.value, powderActive.value, rollContext.value)
  })

  const skillpoints = computed<number[]>(() => {
    const r = result.value
    if (!r)
      return [0, 0, 0, 0, 0]
    return SKP_ORDER.map(s => (r.stats.get(s) as number) ?? 0)
  })

  function setSkillpoint(index: number, value: number) {
    if (!rawBuild.value)
      return
    const base = rawBuild.value.sp ?? skillpoints.value.slice()
    const sp = base.slice()
    sp[index] = value
    rawBuild.value = { ...rawBuild.value, sp }
  }

  function maxPowderSlots(slot: number): number {
    if (!rawBuild.value || !ctx.value)
      return 0
    if (!POWDER_INDEX_BY_SLOT.has(slot))
      return 0
    const slotEntry = rawBuild.value.equipment[slot]
    if (slotEntry?.kind === 'crafted') {
      // Crafted item slot count is computed by computeCraft; for now derive
      // from the level range (slotsByLvlLow) is non-trivial here. The store
      // doesn't have a CraftContext yet (wired in Task 11) — return 0 so
      // powders stay clamped to what the build already has.
      return 0
    }
    const id = slotItemId(slotEntry)
    const item = id == null ? null : ctx.value.rawItemIndex.resolveId(id)
    return Number(item?.slots) || 0
  }

  function powdersForEquipmentSlot(slot: number): number[] {
    const idx = POWDER_INDEX_BY_SLOT.get(slot)
    if (idx === undefined || !rawBuild.value)
      return []
    return rawBuild.value.powders[idx] ?? []
  }

  function setPowders(slot: number, ids: number[]) {
    if (!rawBuild.value)
      return
    const idx = POWDER_INDEX_BY_SLOT.get(slot)
    if (idx === undefined)
      return
    const powders = rawBuild.value.powders.map(p => p.slice())
    powders[idx] = ids.slice(0, maxPowderSlots(slot))
    rawBuild.value = { ...rawBuild.value, powders }
  }

  function setTome(slot: number, id: number | null) {
    if (!rawBuild.value)
      return
    const cleared = clearTomeSlotOverrides(slot)
    if (cleared > 0)
      _pushToast('info', `Cleared ${cleared} custom roll${cleared === 1 ? '' : 's'} on Tome ${slot + 1}`)
    const tomeIds = rawBuild.value.tomeIds.slice()
    tomeIds[slot] = id
    rawBuild.value = { ...rawBuild.value, tomeIds }
  }

  function currentTomeId(slot: number): number | null {
    return rawBuild.value?.tomeIds[slot] ?? null
  }

  function tomesForSlot(slot: number): CleanedRawItem[] {
    const type = TOME_SLOT_TYPES[slot]
    if (!ctx.value || !type)
      return []
    const out: CleanedRawItem[] = []
    for (const t of ctx.value.tomeIndex.byId.values()) {
      if (t.type === type)
        out.push(t)
    }
    return out.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)))
  }

  // --- Aspects ---------------------------------------------------------------
  // Aspect data is keyed by class; the build's class is derived from the weapon.
  const classAspects = computed<Aspect[]>(() => {
    const wt = currentWeaponType()
    const cls = wt ? WEP_TO_CLASS[wt] : undefined
    if (!cls || !ctx.value?.aspectData)
      return []
    return (ctx.value.aspectData[cls] ?? []).filter(a => !a.NONE)
  })

  function currentAspect(slot: number): [number, number] | null {
    return rawBuild.value?.aspects[slot] ?? null
  }

  /** Equip an aspect into a slot (defaults to its highest tier) or clear it. */
  function setAspect(slot: number, id: number | null) {
    if (!rawBuild.value)
      return
    const aspects = rawBuild.value.aspects.slice()
    if (id == null) {
      aspects[slot] = null
    }
    else {
      const asp = classAspects.value.find(a => a.id === id)
      const tier = asp && asp.tiers.length > 0 ? asp.tiers.length : 1
      aspects[slot] = [id, tier]
    }
    rawBuild.value = { ...rawBuild.value, aspects }
  }

  function setAspectTier(slot: number, tier: number) {
    if (!rawBuild.value)
      return
    const cur = rawBuild.value.aspects[slot]
    if (!cur)
      return
    const aspects = rawBuild.value.aspects.slice()
    aspects[slot] = [cur[0], tier]
    rawBuild.value = { ...rawBuild.value, aspects }
  }

  const atreeNodes = computed(() => {
    if (!ctx.value || !rawBuild.value)
      return []
    const wt = currentWeaponType()
    const cls = wt ? WEP_TO_CLASS[wt] : undefined
    return cls ? getSortedClassAtree(ctx.value.atreeData, cls) : []
  })

  const atreeValidation = computed(() => {
    const sel = new Map<number, boolean>((rawBuild.value?.activeAtree ?? []).map(id => [id, true]))
    return validateAtree(atreeNodes.value, sel, rawBuild.value?.level ?? 1)
  })

  function isAtreeActive(id: number): boolean {
    return atreeValidation.value.reachable.has(id)
  }

  function toggleAtreeNode(id: number) {
    if (!rawBuild.value)
      return
    const sel = new Set(rawBuild.value.activeAtree)
    if (sel.has(id))
      sel.delete(id)
    else
      sel.add(id)
    const tentative = new Map([...sel].map(x => [x, true] as [number, boolean]))
    const reachable = validateAtree(atreeNodes.value, tentative, rawBuild.value.level).reachable
    rawBuild.value = { ...rawBuild.value, activeAtree: [...reachable] }
    atreeMessage.value = null
  }

  function resetAtree() {
    if (!rawBuild.value)
      return
    if (rawBuild.value.activeAtree.length === 0)
      return
    rawBuild.value = { ...rawBuild.value, activeAtree: [] }
    atreeMessage.value = null
  }

  function unlockAtreeNode(id: number) {
    if (!rawBuild.value)
      return
    const before = new Set(rawBuild.value.activeAtree)
    const next = unlockPathTo(atreeNodes.value, before, id, rawBuild.value.level)
    const changed = next.length !== before.size || next.some(n => !before.has(n))
    if (changed) {
      rawBuild.value = { ...rawBuild.value, activeAtree: next }
      atreeMessage.value = null
      return
    }
    // No path could be auto-selected — explain why so the click isn't silent.
    const name = atreeNodes.value.find(n => n.ability.id === id)?.ability.display_name ?? `Node ${id}`
    atreeMessage.value = before.has(id)
      ? `"${name}" is already unlocked.`
      : `Can't auto-path to "${name}" — it's blocked or needs more archetype points.`
  }

  return {
    rawBuild,
    ctx,
    loading,
    error,
    loadFromHash,
    newBuild,
    upgradeBuild,
    setItem,
    setCraftedSlot,
    applyImport,
    setLevel,
    currentHash,
    itemsForSlot,
    equipmentSearchItem,
    result,
    skillpoints,
    setSkillpoint,
    boosts,
    toggleBoost,
    setElemDmg,
    setBoosts,
    resetBoosts,
    powderActive,
    setPowderTier,
    setPowderActive,
    resetPowderActive,
    atreeNodes,
    atreeValidation,
    atreeMessage,
    isAtreeActive,
    toggleAtreeNode,
    unlockAtreeNode,
    resetAtree,
    maxPowderSlots,
    powdersForEquipmentSlot,
    setPowders,
    setTome,
    currentTomeId,
    tomesForSlot,
    classAspects,
    currentAspect,
    setAspect,
    setAspectTier,
    loadedVersionId,
    latestVersionId,
    loadedGameVersion,
    latestGameVersion,
    isOldVersion,
    // Roll controls
    rollPreset,
    setRollPreset,
    itemRollOverrides,
    tomeRollOverrides,
    setOverride,
    clearOverride,
    clearSlotOverrides,
    setTomeOverride,
    clearTomeOverride,
    clearTomeSlotOverrides,
    clearAllOverrides,
    totalOverrideCount,
    itemsWithOverridesCount,
    expandedAtSlot,
    expandedAtTomeSlot,
  }
})
