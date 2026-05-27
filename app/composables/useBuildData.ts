import type { BuildContext } from '~/lib/build/compute-build'
import type { EncodingConstants } from '~/lib/codec/encoding-constants'
import type { VersionEntry } from '~/lib/data/cdn-adapter/version-paths'
import type { CdnClient } from '~/lib/data/cdn-client'
import type { RawAspectData } from '~/lib/types/aspect'
import type { AtreeData } from '~/lib/types/atree'
import type { ItemSet } from '~/lib/types/item'
import { buildRawItemIndex, buildRawTomeIndex } from '~/lib/build/resolve'
import { BitVector, BitVectorCursor } from '~/lib/codec/bit-vector'
import { decodeHeader } from '~/lib/codec/header'
import { cdnPathFor, latestVersionId, resolveVersionSegment } from '~/lib/data/cdn-adapter/version-paths'
import { createCdnClient } from '~/lib/data/cdn-client'

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

interface RawItemsFile { items: Array<Record<string, unknown> & { id?: number, type?: string }>, sets: Record<string, ItemSet> }

export interface LoadedBuildData {
  ctx: BuildContext
  enc: EncodingConstants
  weaponType: (id: number) => string | null
}

const cache = new Map<number, Promise<LoadedBuildData>>()

export async function loadBuildContext(client: CdnClient, versionId: number): Promise<LoadedBuildData> {
  const cached = cache.get(versionId)
  if (cached)
    return cached
  const promise = (async () => {
    const versions = await fetchVersions(client)
    const segment = resolveVersionSegment(versionId, versions)
    const [itemsFile, atreeData, enc, tomesFile, aspectData] = await Promise.all([
      client.fetchJson<RawItemsFile>(cdnPathFor(segment, 'items.json')),
      client.fetchJson<AtreeData>(cdnPathFor(segment, 'atree.json')),
      client.fetchJson<EncodingConstants>(cdnPathFor(segment, 'encoding_consts.json')),
      client.fetchJson<{ tomes: Array<Record<string, unknown>> }>(cdnPathFor(segment, 'tomes.json')),
      client.fetchJson<RawAspectData>(cdnPathFor(segment, 'aspects.json')),
    ])
    ;(enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT = (enc.POWDER_ELEMENTS as unknown[]).length
    const rawItemIndex = buildRawItemIndex(itemsFile.items as Parameters<typeof buildRawItemIndex>[0])
    const tomeIndex = buildRawTomeIndex(tomesFile.tomes)
    const sets = new Map(Object.entries(itemsFile.sets ?? {}))
    const typeById = new Map<number, string>()
    for (const it of itemsFile.items) {
      if (typeof it.id === 'number' && typeof it.type === 'string')
        typeById.set(it.id, it.type)
    }
    return {
      ctx: { rawItemIndex, sets, atreeData, tomeIndex, aspectData },
      enc,
      weaponType: (id: number) => typeById.get(id) ?? null,
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
