import { Buffer } from 'node:buffer'
import { loadBuildContext, peekVersionId } from '~/composables/useBuildData'
import { extractBuildMeta } from '~/lib/build/build-meta'
import { computeBuild } from '~/lib/build/compute-build'
import { decodeRawBuild } from '~/lib/codec/build-codec'
import { createCdnClient } from '~/lib/data/cdn-client'

const WEAPON_RECIPE_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const config = useRuntimeConfig()

  interface BuildResp {
    buildString: string
    name: string
    visibility: string
    tags?: string[]
    credits?: { username: string, displayName: string }[]
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
  const recipes = loaded.ctx.craftContext?.recipes
  const raw = decodeRawBuild(build.buildString, () => ({
    enc: loaded.enc,
    atreeData: loaded.ctx.atreeData,
    weaponType: loaded.weaponType,
    recipeIsWeapon: recipes
      ? (rid: number) => {
          const rec = recipes.get(rid)
          return rec ? WEAPON_RECIPE_TYPES.has(rec.type) : false
        }
      : () => false,
  }))
  const result = computeBuild(raw, loaded.ctx)
  const credits = (build.credits ?? []).map(c => ({ username: c.username, name: c.displayName }))
  const buildMeta = extractBuildMeta(raw, loaded.ctx, loaded.weaponType, result, build.name, credits, build.tags ?? [])

  const ogPath = buildOgImagePath('BuildCard', buildMeta as Record<string, unknown>, `/b/${id}`)
  const data = await $fetch<ArrayBuffer>(ogPath, { responseType: 'arrayBuffer' })

  setResponseHeader(event, 'content-type', 'image/png')
  return Buffer.from(data)
})
