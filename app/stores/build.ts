import type { BuildContext, BuildResult } from '~/lib/build/compute-build'
import type { CleanedRawItem } from '~/lib/build/resolve'
import type { RawBuild } from '~/lib/codec/build-codec'
import type { EncodingConstants } from '~/lib/codec/encoding-constants'
import type { CdnClient } from '~/lib/data/cdn-client'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { loadBuildContext, peekVersionId } from '~/composables/useBuildData'
import { getSortedClassAtree } from '~/lib/atree/build-atree'
import { computeBuild } from '~/lib/build/compute-build'
import { decodeRawBuild, encodeRawBuild } from '~/lib/codec/build-codec'
import { WEP_TO_CLASS } from '~/lib/codec/wep-to-class'

const SLOT_TYPES = ['helmet', 'chestplate', 'leggings', 'boots', 'ring', 'ring', 'bracelet', 'necklace'] as const

export const useBuildStore = defineStore('build', () => {
  const rawBuild = shallowRef<RawBuild | null>(null)
  const ctx = shallowRef<BuildContext | null>(null)
  const enc = shallowRef<EncodingConstants | null>(null)
  const weaponTypeFn = shallowRef<((id: number) => string | null) | null>(null)
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
      rawBuild.value = raw
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      rawBuild.value = null
      ctx.value = null
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
    const type = slot === 8 ? currentWeaponType() : SLOT_TYPES[slot]
    if (!type)
      return []
    const out: CleanedRawItem[] = []
    for (const item of ctx.value.rawItemIndex.byId.values()) {
      if ((item.id as number) >= 10000)
        continue // NONE placeholders
      if (item.type === type)
        out.push(item)
    }
    return out.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)))
  }

  const result = computed<BuildResult | null>(() => {
    if (!rawBuild.value || !ctx.value)
      return null
    return computeBuild(rawBuild.value, ctx.value)
  })

  return { rawBuild, ctx, loading, error, loadFromHash, setItem, setLevel, currentHash, itemsForSlot, result }
})
