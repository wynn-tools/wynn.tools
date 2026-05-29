import {
  computeBuild,
  createCdnClient,
  decodeRawBuild,
  loadBuildContext,
  peekVersionId,
  slotItemId,
  WEP_TO_CLASS,
} from '../build-core'
import { env } from '../env'
import { AppError } from '../lib/errors'

const WEAPON_RECIPE_TYPES = new Set(['spear', 'wand', 'dagger', 'bow', 'relik'])

let client: ReturnType<typeof createCdnClient> | null = null
function cdn() {
  client ??= createCdnClient(env().CDN_BASE_URL)
  return client
}

const cache = new Map<string, { gameVersion: string, decoded: unknown, playerClass: string | null, itemIds: number[] }>()

export async function decodeBuild(buildString: string): Promise<{
  gameVersion: string
  decoded: unknown
  playerClass: string | null
  itemIds: number[]
}> {
  const cached = cache.get(buildString)
  if (cached)
    return cached
  try {
    const versionId = peekVersionId(buildString)
    const loaded = await loadBuildContext(cdn(), versionId)
    const recipes = loaded.ctx.craftContext?.recipes
    const raw = decodeRawBuild(buildString, () => ({
      enc: loaded.enc,
      atreeData: loaded.ctx.atreeData,
      weaponType: loaded.weaponType,
      recipeIsWeapon: (recipeId: number) => {
        const rec = recipes?.get(recipeId)
        return rec ? WEAPON_RECIPE_TYPES.has(rec.type) : false
      },
    }))
    const decoded = computeBuild(raw, loaded.ctx)

    // Extract item IDs from NORMAL equipment slots (indices 0–8), excluding nulls
    const itemIds = raw.equipment
      .map(slot => slotItemId(slot))
      .filter((id): id is number => id !== null)

    // Derive player class from weapon slot (index 8)
    const weaponId = slotItemId(raw.equipment[8])
    const weaponType = weaponId !== null ? loaded.weaponType(weaponId) : null
    const playerClass = weaponType !== null ? (WEP_TO_CLASS[weaponType] ?? null) : null

    const result = { gameVersion: loaded.gameVersion, decoded, playerClass, itemIds }
    cache.set(buildString, result)
    return result
  }
  catch (err) {
    if (err instanceof AppError)
      throw err
    throw new AppError(400, 'invalid_build', `Could not decode build: ${(err as Error).message}`)
  }
}
