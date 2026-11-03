import { Buffer } from 'node:buffer'
import { decodeBuildHash, loadBuildContext, peekVersionId } from '~/composables/useBuildData'
import { extractBuildMeta } from '~/lib/build/build-meta'
import { computeBuild } from '~/lib/build/compute-build'
import { createCdnClient } from '~/lib/data/cdn-client'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const config = useRuntimeConfig()

  interface BuildResp {
    buildString: string
    name: string
    visibility: string
    tags?: string[]
    credits?: { username: string, displayName: string }[]
    owner?: { name: string } | null
  }
  let build: BuildResp
  try {
    build = await $fetch<BuildResp>(`${config.public.apiBaseUrl}/v1/builds/${id}`)
  }
  catch {
    throw createError({ statusCode: 404 })
  }

  if (build.visibility === 'private')
    throw createError({ statusCode: 404 })

  const client = createCdnClient(config.public.cdnBaseUrl)
  const versionId = peekVersionId(build.buildString)
  const loaded = await loadBuildContext(client, versionId)
  const raw = await decodeBuildHash(client, build.buildString, loaded)
  const result = computeBuild(raw, loaded.ctx)
  const credits = (build.credits ?? []).map(c => ({ username: c.username, name: c.displayName }))
  const buildMeta = extractBuildMeta(raw, loaded.ctx, loaded.weaponType, result, build.name, build.owner?.name ?? null, credits, build.tags ?? [])

  const ogPath = buildOgImagePath('BuildCard', buildMeta as Record<string, unknown>, `/b/${id}`)
  const data = await $fetch<ArrayBuffer>(ogPath, { responseType: 'arrayBuffer' })

  setResponseHeader(event, 'content-type', 'image/png')
  return Buffer.from(data)
})
