import type { RawItem } from '../types/item'
import type { OutputItem } from './cdn-adapter/item-adapter'
import type { VersionEntry } from './cdn-adapter/version-paths'
import type { CdnClient } from './cdn-client'
import type { ItemDb } from './item-db'
import { adaptCdnItem } from './cdn-adapter/item-adapter'
import { adaptCdnSets } from './cdn-adapter/sets-adapter'
import { cdnPathFor, latestVersionId, resolveVersionSegment } from './cdn-adapter/version-paths'
import { buildItemDb } from './item-db'

/**
 * Load the item database for the item browser from the latest CDN snapshot.
 * New-schema items/sets are run through the CDN adapters into the hppeng-raw
 * shape `buildItemDb` already consumes.
 */
export async function loadItemData(client: CdnClient): Promise<ItemDb> {
  const versions = await client.fetchJson<VersionEntry[]>('versions.json')
  const segment = resolveVersionSegment(latestVersionId(versions), versions)
  const [itemsFile, setsFile] = await Promise.all([
    client.fetchJson<{ items: OutputItem[] }>(cdnPathFor(segment, 'items.json')),
    client.fetchJson<Parameters<typeof adaptCdnSets>[0]>(cdnPathFor(segment, 'sets.json')),
  ])
  const items = itemsFile.items.map(adaptCdnItem) as unknown as RawItem[]
  const sets = adaptCdnSets(setsFile)
  return buildItemDb({ items, sets: Object.fromEntries(sets) })
}
