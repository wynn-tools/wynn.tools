import type { ItemDb } from '~/lib/data/item-db'
import { createCdnClient } from '~/lib/data/cdn-client'
import { loadItemData } from '~/lib/data/load-items'

/**
 * Loads the item database from the CDN once and shares it across the app.
 * Pure data logic lives in ~/lib/data; this is the only Nuxt-aware wrapper.
 */
export function useItemData() {
  const config = useRuntimeConfig()
  return useAsyncData<ItemDb>('item-data', () => {
    const client = createCdnClient(config.public.cdnBaseUrl)
    return loadItemData(client)
  })
}
