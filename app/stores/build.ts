import type { BuildContext, BuildResult } from '~/lib/build/compute-build'
import type { CleanedRawItem } from '~/lib/build/resolve'
import type { RawBuild } from '~/lib/codec/build-codec'
import type { EncodingConstants } from '~/lib/codec/encoding-constants'
import type { CdnClient } from '~/lib/data/cdn-client'
import type { SearchItem } from '~/lib/items-search/types'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { loadBuildContext, peekVersionId, resolveLatestVersionId } from '~/composables/useBuildData'
import { getSortedClassAtree } from '~/lib/atree/build-atree'
import { unlockPathTo } from '~/lib/atree/pathfind'
import { validateAtree } from '~/lib/atree/validate'
import { computeBuild } from '~/lib/build/compute-build'
import { POWDER_INDEX_BY_SLOT } from '~/lib/build/resolve'
import { decodeRawBuild, encodeRawBuild } from '~/lib/codec/build-codec'
import { num } from '~/lib/codec/codec-util'
import { WEP_TO_CLASS } from '~/lib/codec/wep-to-class'
import { SKP_ORDER } from '~/lib/math/constants'

const DEFAULT_LEVEL = 106

const SLOT_TYPES = ['helmet', 'chestplate', 'leggings', 'boots', 'ring', 'ring', 'bracelet', 'necklace'] as const

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

export const useBuildStore = defineStore('build', () => {
  const rawBuild = shallowRef<RawBuild | null>(null)
  const atreeMessage = ref<string | null>(null)
  const ctx = shallowRef<BuildContext | null>(null)
  const enc = shallowRef<EncodingConstants | null>(null)
  const weaponTypeFn = shallowRef<((id: number) => string | null) | null>(null)
  const searchItemById = shallowRef<Map<number, SearchItem> | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadFromHash(hash: string, client: CdnClient) {
    loading.value = true
    error.value = null
    try {
      const versionId = peekVersionId(hash)
      const loaded = await loadBuildContext(client, versionId)
      const raw = decodeRawBuild(hash, () => ({ enc: loaded.enc, atreeData: loaded.ctx.atreeData, weaponType: loaded.weaponType }))
      ctx.value = loaded.ctx
      enc.value = loaded.enc
      weaponTypeFn.value = loaded.weaponType
      searchItemById.value = loaded.searchItemById
      rawBuild.value = raw
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      rawBuild.value = null
      ctx.value = null
      searchItemById.value = null
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
      const versionId = await resolveLatestVersionId(client)
      const loaded = await loadBuildContext(client, versionId)
      const e = loaded.enc
      ctx.value = loaded.ctx
      enc.value = e
      weaponTypeFn.value = loaded.weaponType
      searchItemById.value = loaded.searchItemById
      atreeMessage.value = null
      rawBuild.value = {
        versionId,
        equipmentIds: Array.from({ length: num(e, 'EQUIPMENT_NUM') }).fill(null),
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
    }
    finally {
      loading.value = false
    }
  }

  function setItem(slot: number, id: number | null) {
    if (!rawBuild.value)
      return
    const equipmentIds = rawBuild.value.equipmentIds.slice()
    equipmentIds[slot] = id
    rawBuild.value = { ...rawBuild.value, equipmentIds }
  }

  function setLevel(level: number) {
    if (!rawBuild.value)
      return
    rawBuild.value = { ...rawBuild.value, level }
  }

  function currentWeaponType(): string | null {
    if (!rawBuild.value || !weaponTypeFn.value)
      return null
    const wid = rawBuild.value.equipmentIds[8]
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
    const id = rawBuild.value?.equipmentIds[slot]
    if (id == null || !searchItemById.value)
      return null
    return searchItemById.value.get(id) ?? null
  }

  const result = computed<BuildResult | null>(() => {
    if (!rawBuild.value || !ctx.value)
      return null
    return computeBuild(rawBuild.value, ctx.value)
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
    const id = rawBuild.value.equipmentIds[slot]
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

  return { rawBuild, ctx, loading, error, loadFromHash, newBuild, setItem, setLevel, currentHash, itemsForSlot, equipmentSearchItem, result, skillpoints, setSkillpoint, atreeNodes, atreeValidation, atreeMessage, isAtreeActive, toggleAtreeNode, unlockAtreeNode, maxPowderSlots, powdersForEquipmentSlot, setPowders, setTome, currentTomeId, tomesForSlot }
})
