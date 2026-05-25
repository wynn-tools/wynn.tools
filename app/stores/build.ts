import type { BuildContext, BuildResult } from '~/lib/build/compute-build'
import type { RawBuild } from '~/lib/codec/build-codec'
import type { CdnClient } from '~/lib/data/cdn-client'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { loadBuildContext, peekVersionId } from '~/composables/useBuildData'
import { computeBuild } from '~/lib/build/compute-build'
import { decodeRawBuild } from '~/lib/codec/build-codec'

export const useBuildStore = defineStore('build', () => {
  const rawBuild = shallowRef<RawBuild | null>(null)
  const ctx = shallowRef<BuildContext | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadFromHash(hash: string, client: CdnClient) {
    loading.value = true
    error.value = null
    try {
      const versionId = peekVersionId(hash)
      const { ctx: loadedCtx, enc, weaponType } = await loadBuildContext(client, versionId)
      const raw = decodeRawBuild(hash, () => ({ enc, atreeData: loadedCtx.atreeData, weaponType }))
      ctx.value = loadedCtx
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

  const result = computed<BuildResult | null>(() => {
    if (!rawBuild.value || !ctx.value)
      return null
    return computeBuild(rawBuild.value, ctx.value)
  })

  return { rawBuild, ctx, loading, error, loadFromHash, result }
})
