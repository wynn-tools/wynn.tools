import type { BuildContext } from '~/lib/build/compute-build'
import type { EncodingConstants } from '~/lib/codec/encoding-constants'
import type { CdnClient } from '~/lib/data/cdn-client'
import type { AtreeData } from '~/lib/types/atree'
import type { ItemSet } from '~/lib/types/item'
import { buildRawItemIndex } from '~/lib/build/resolve'
import { BitVector, BitVectorCursor } from '~/lib/codec/bit-vector'
import { decodeHeader } from '~/lib/codec/header'
import { WYNN_VERSION_NAMES } from '~/lib/codec/version'
import { createCdnClient } from '~/lib/data/cdn-client'

export function peekVersionId(hash: string): number {
  return decodeHeader(new BitVectorCursor(new BitVector(hash, hash.length * 6)))
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
    const v = WYNN_VERSION_NAMES[versionId]
    if (!v)
      throw new Error(`Unknown build version id ${versionId}`)
    const [itemsFile, atreeData, enc] = await Promise.all([
      client.fetchJson<RawItemsFile>(`${v}/items.json`),
      client.fetchJson<AtreeData>(`${v}/atree.json`),
      client.fetchJson<EncodingConstants>(`${v}/encoding_consts.json`),
    ])
    ;(enc as Record<string, unknown>).POWDER_ELEMENTS_COUNT = (enc.POWDER_ELEMENTS as unknown[]).length
    const rawItemIndex = buildRawItemIndex(itemsFile.items as Parameters<typeof buildRawItemIndex>[0])
    const sets = new Map(Object.entries(itemsFile.sets ?? {}))
    const typeById = new Map<number, string>()
    for (const it of itemsFile.items) {
      if (typeof it.id === 'number' && typeof it.type === 'string')
        typeById.set(it.id, it.type)
    }
    return {
      ctx: { rawItemIndex, sets, atreeData },
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
