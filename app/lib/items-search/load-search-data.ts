import type { SearchIngredient, SearchItem } from './types'
import type { VersionEntry } from '~/lib/data/cdn-adapter/version-paths'
import type { CdnClient } from '~/lib/data/cdn-client'

import { cdnPathFor, latestVersionId, resolveVersionSegment } from '~/lib/data/cdn-adapter/version-paths'
import { adaptIngredients } from './ingredient-search-adapter'
import { adaptItems } from './item-search-adapter'

export interface SearchData {
  items: SearchItem[]
  ingredients: SearchIngredient[]
  gameVersion: string
}

export async function loadSearchData(client: CdnClient): Promise<SearchData> {
  const versions = await client.fetchJson<VersionEntry[]>('versions.json')
  const gameVersion = resolveVersionSegment(latestVersionId(versions), versions)
  const [itemsFile, ingredientsFile] = await Promise.all([
    client.fetchJson<Parameters<typeof adaptItems>[0]>(cdnPathFor(gameVersion, 'items.json')),
    client.fetchJson<Parameters<typeof adaptIngredients>[0]>(cdnPathFor(gameVersion, 'ingredients.json')),
  ])
  return {
    items: adaptItems(itemsFile),
    ingredients: adaptIngredients(ingredientsFile),
    gameVersion,
  }
}
