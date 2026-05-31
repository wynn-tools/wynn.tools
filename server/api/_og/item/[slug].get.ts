import type { SearchItem } from '~/lib/items-search/types'
import { Buffer } from 'node:buffer'
import { createCdnClient } from '~/lib/data/cdn-client'
import { loadSearchData } from '~/lib/items-search/load-search-data'
import { buildSlugIndex, resolveSlug } from '~/lib/items-search/slug'
import { extractItemMeta } from '~/lib/items/item-meta'

// Module-level cache: items rarely change; re-fetch only when gameVersion changes
let itemCache: { gameVersion: string, index: Map<string, SearchItem[]> } | null = null

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const { name: nameHint } = getQuery(event) as { name?: string }
  const config = useRuntimeConfig()

  const client = createCdnClient(config.public.cdnBaseUrl)

  // Warm or reuse cache
  if (!itemCache) {
    const data = await loadSearchData(client)
    itemCache = { gameVersion: data.gameVersion, index: buildSlugIndex(data.items) }
  }

  const item = resolveSlug(itemCache.index, slug, nameHint)
  if (!item)
    throw createError({ statusCode: 404 })

  const itemMeta = extractItemMeta(item)
  const ogPath = buildOgImagePath('ItemCard', itemMeta as Record<string, unknown>, `/items/${slug}`)
  const data = await $fetch<ArrayBuffer>(ogPath, { responseType: 'arrayBuffer' })

  setResponseHeader(event, 'content-type', 'image/png')
  return Buffer.from(data)
})
