import type { BuildContext } from '~/lib/build/compute-build'
import type { EncodingConstants } from '~/lib/codec/encoding-constants'
import type { CdnAspect } from '~/lib/data/cdn-adapter/aspect-adapter'
import type { CdnAtreeFile } from '~/lib/data/cdn-adapter/atree-adapter'
import type { OutputItem } from '~/lib/data/cdn-adapter/item-adapter'
import type { CdnMajorIdEntry } from '~/lib/data/cdn-adapter/majid-adapter'
import type { OutputTome } from '~/lib/data/cdn-adapter/tome-adapter'
import type { VersionEntry } from '~/lib/data/cdn-adapter/version-paths'
import type { CdnClient } from '~/lib/data/cdn-client'
import type { SearchItem } from '~/lib/items-search/types'
import { buildRawItemIndex, buildRawTomeIndex } from '~/lib/build/resolve'
import { BitVector, BitVectorCursor } from '~/lib/codec/bit-vector'
import { decodeHeader } from '~/lib/codec/header'
import { mergeClassAspects } from '~/lib/data/cdn-adapter/aspect-adapter'
import { mergeClassAtrees } from '~/lib/data/cdn-adapter/atree-adapter'
import { adaptCdnItem } from '~/lib/data/cdn-adapter/item-adapter'
import { adaptCdnMajorIds } from '~/lib/data/cdn-adapter/majid-adapter'
import { adaptCdnSets } from '~/lib/data/cdn-adapter/sets-adapter'
import { adaptCdnTome } from '~/lib/data/cdn-adapter/tome-adapter'
import { cdnPathFor, latestVersionId, resolveVersionSegment } from '~/lib/data/cdn-adapter/version-paths'
import { createCdnClient } from '~/lib/data/cdn-client'
import { adaptItems } from '~/lib/items-search/item-search-adapter'

/** Class name (WynnClass casing) → lowercase per-class file segment. */
const ATREE_CLASSES = [
  ['Archer', 'archer'],
  ['Warrior', 'warrior'],
  ['Mage', 'mage'],
  ['Assassin', 'assassin'],
  ['Shaman', 'shaman'],
] as const

export function peekVersionId(hash: string): number {
  return decodeHeader(new BitVectorCursor(new BitVector(hash, hash.length * 6)))
}

let versionsCache: Promise<VersionEntry[]> | null = null

/** Fetch (and cache) the CDN root versions.json index. */
function fetchVersions(client: CdnClient): Promise<VersionEntry[]> {
  versionsCache ??= client.fetchJson<VersionEntry[]>('versions.json')
  return versionsCache
}

/** The versionId a freshly created build should encode (newest CDN snapshot). */
export async function resolveLatestVersionId(client: CdnClient): Promise<number> {
  return latestVersionId(await fetchVersions(client))
}

export interface LoadedBuildData {
  ctx: BuildContext
  enc: EncodingConstants
  weaponType: (id: number) => string | null
  searchItemById: Map<number, SearchItem>
}

const cache = new Map<number, Promise<LoadedBuildData>>()

export async function loadBuildContext(client: CdnClient, versionId: number): Promise<LoadedBuildData> {
  const cached = cache.get(versionId)
  if (cached)
    return cached
  const promise = (async () => {
    const versions = await fetchVersions(client)
    const segment = resolveVersionSegment(versionId, versions)
    const get = <T>(file: string): Promise<T> => client.fetchJson<T>(cdnPathFor(segment, file))

    const [itemsFile, tomesFile, setsFile, enc, atreeEntries, aspectEntries, majidFile] = await Promise.all([
      get<{ items: OutputItem[] }>('items.json'),
      get<{ tomes: OutputTome[] }>('tomes.json'),
      // sets.json is a new file absent from backfilled historical snapshots
      // (those have no set items anyway); tolerate its absence with empty sets.
      get<Parameters<typeof adaptCdnSets>[0]>('sets.json').catch(() => ({ sets: [] })),
      get<EncodingConstants>('encoding_consts.json'),
      Promise.all(ATREE_CLASSES.map(async ([cls, file]) =>
        [cls, await get<CdnAtreeFile>(`atree/${file}.json`)] as const)),
      Promise.all(ATREE_CLASSES.map(async ([cls, file]) =>
        [cls, await get<{ aspects: CdnAspect[] }>(`aspects/${file}.json`)] as const)),
      // majid.json absent from backfilled historical snapshots; tolerate with empty map
      get<Record<string, CdnMajorIdEntry>>('majid.json').catch(() => ({})),
    ])
    ;(enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT = (enc.POWDER_ELEMENTS as unknown[]).length

    const adaptedItems = itemsFile.items.map(adaptCdnItem)
    const rawItemIndex = buildRawItemIndex(adaptedItems as Parameters<typeof buildRawItemIndex>[0])
    const tomeIndex = buildRawTomeIndex(tomesFile.tomes.map(adaptCdnTome))
    const sets = adaptCdnSets(setsFile)
    const atreeData = mergeClassAtrees(Object.fromEntries(atreeEntries))
    const aspectData = mergeClassAspects(Object.fromEntries(aspectEntries))
    const majorIdData = adaptCdnMajorIds(majidFile)

    const typeById = new Map<number, string>()
    for (const it of adaptedItems) {
      if (typeof it.id === 'number' && typeof it.type === 'string')
        typeById.set(it.id, it.type)
    }
    const searchItems = adaptItems({ items: itemsFile.items })
    const searchItemById = new Map<number, SearchItem>(searchItems.map(s => [s.id, s]))
    return {
      ctx: { rawItemIndex, sets, atreeData, tomeIndex, aspectData, majorIdData },
      enc,
      weaponType: (id: number) => typeById.get(id) ?? null,
      searchItemById,
    } satisfies LoadedBuildData
  })()
  cache.set(versionId, promise)
  promise.catch(() => cache.delete(versionId))
  return promise
}

/** Nuxt-aware helper: build a CDN client from runtime config. */
export function useCdnClient(): CdnClient {
  const config = useRuntimeConfig()
  return createCdnClient(config.public.cdnBaseUrl)
}
