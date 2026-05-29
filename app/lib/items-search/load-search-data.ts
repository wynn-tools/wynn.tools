import type { SearchCharm, SearchIngredient, SearchItem, SearchMaterial, SearchTome } from './types'
import type { VersionEntry } from '~/lib/data/cdn-adapter/version-paths'
import type { CdnClient } from '~/lib/data/cdn-client'
import type { ItemSet } from '~/lib/types/item'

import { adaptCdnSets } from '~/lib/data/cdn-adapter/sets-adapter'
import { cdnPathFor, latestVersionId, resolveVersionSegment } from '~/lib/data/cdn-adapter/version-paths'
import { adaptSearchCharms } from './charm-search-adapter'
import { adaptIngredients } from './ingredient-search-adapter'
import { adaptItems } from './item-search-adapter'
import { adaptSearchMaterials } from './material-search-adapter'
import { adaptSearchTomes } from './tome-search-adapter'

export interface SearchData {
  items: SearchItem[]
  ingredients: SearchIngredient[]
  tomes: SearchTome[]
  charms: SearchCharm[]
  materials: SearchMaterial[]
  sets: Map<string, ItemSet>
  gameVersion: string
}

export async function loadSearchData(client: CdnClient): Promise<SearchData> {
  const versions = await client.fetchJson<VersionEntry[]>('versions.json')
  const gameVersion = resolveVersionSegment(latestVersionId(versions), versions)
  const [itemsFile, ingredientsFile, tomesFile, charmsFile, materialsFile, setsFile] = await Promise.all([
    client.fetchJson<Parameters<typeof adaptItems>[0]>(cdnPathFor(gameVersion, 'items.json')),
    client.fetchJson<Parameters<typeof adaptIngredients>[0]>(cdnPathFor(gameVersion, 'ingredients.json')),
    client.fetchJson<Parameters<typeof adaptSearchTomes>[0]>(cdnPathFor(gameVersion, 'tomes.json')).catch(() => ({ tomes: [] })),
    client.fetchJson<Parameters<typeof adaptSearchCharms>[0]>(cdnPathFor(gameVersion, 'charms.json')).catch(() => ({ charms: [] })),
    client.fetchJson<Parameters<typeof adaptSearchMaterials>[0]>(cdnPathFor(gameVersion, 'materials.json')).catch(() => ({ materials: [] })),
    client.fetchJson<Parameters<typeof adaptCdnSets>[0]>(cdnPathFor(gameVersion, 'sets.json')).catch(() => ({ sets: [] })),
  ])
  return {
    items: adaptItems(itemsFile),
    ingredients: adaptIngredients(ingredientsFile),
    tomes: adaptSearchTomes(tomesFile),
    charms: adaptSearchCharms(charmsFile),
    materials: adaptSearchMaterials(materialsFile),
    sets: adaptCdnSets(setsFile),
    gameVersion,
  }
}
