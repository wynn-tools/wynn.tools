import {
  computeBuild,
  createCdnClient,
  decodeRawBuild,
  loadBuildContext,
  peekVersionId,
} from '../build-core'
import { env } from '../env'
import { AppError } from '../lib/errors'

let client: ReturnType<typeof createCdnClient> | null = null
function cdn() {
  client ??= createCdnClient(env().CDN_BASE_URL)
  return client
}

const cache = new Map<string, { gameVersion: string, decoded: unknown }>()

export async function decodeBuild(buildString: string): Promise<{ gameVersion: string, decoded: unknown }> {
  const cached = cache.get(buildString)
  if (cached)
    return cached
  try {
    const versionId = peekVersionId(buildString)
    const loaded = await loadBuildContext(cdn(), versionId)
    const raw = decodeRawBuild(buildString, () => ({
      enc: loaded.enc,
      atreeData: loaded.ctx.atreeData,
      weaponType: loaded.weaponType,
      recipeIsWeapon: () => false,
    }))
    const decoded = computeBuild(raw, loaded.ctx)
    const result = { gameVersion: loaded.gameVersion, decoded }
    cache.set(buildString, result)
    return result
  }
  catch (err) {
    if (err instanceof AppError)
      throw err
    throw new AppError(400, 'invalid_build', `Could not decode build: ${(err as Error).message}`)
  }
}
