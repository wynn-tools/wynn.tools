import type { CraftContext } from '~/lib/crafter/types'
import type { CdnClient } from '~/lib/data/cdn-client'
import { loadBuildContext, resolveLatestVersionId, useCdnClient } from '~/composables/useBuildData'

export interface LoadedCraftData {
  craftContext: CraftContext
  gameVersion: string
  versionId: number
}

/**
 * Thin wrapper over `loadBuildContext` that exposes just the crafter slice
 * (ingredients + recipes) for crafter-only pages. Reuses the same cached
 * fetch path used by the builder — no duplicate adapter logic.
 *
 * If `versionId` is omitted, resolves to the newest snapshot.
 */
export async function loadCraftData(client: CdnClient, versionId?: number): Promise<LoadedCraftData> {
  const resolved = versionId ?? await resolveLatestVersionId(client)
  const loaded = await loadBuildContext(client, resolved)
  // `craftContext` is always populated by loadBuildContext (empty maps on
  // older snapshots that lack ingredients.json/recipes.json).
  const craftContext = loaded.ctx.craftContext ?? { ingredients: new Map(), recipes: new Map() }
  return { craftContext, gameVersion: loaded.gameVersion, versionId: resolved }
}

/** Nuxt-aware helper mirroring `useCdnClient` from useBuildData. */
export function useCraftData() {
  const client = useCdnClient()
  return {
    client,
    load: (versionId?: number) => loadCraftData(client, versionId),
  }
}
